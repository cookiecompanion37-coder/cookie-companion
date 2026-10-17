// GPU server client — fetches live Cloudflare tunnel URL from Supabase and wraps all 5 GPU routes.
// The URL rotates on every Kaggle session; always resolve before each request.

const SB = process.env.GPU_NODE_SUPABASE_URL ?? "https://xiwpzkuuoiwwwkrbphbp.supabase.co";
const AK = process.env.GPU_NODE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd3B6a3V1b2l3d3drcmJwaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxOTU5MTksImV4cCI6MjEwNzc3MTkxOX0.xSZfM1IYdkefsIihLv74N3-wVvt4rlOSMbIgMepvLlI";

let cachedUrl: string | null = null;
let cacheExpiry = 0;

/** Returns the live GPU base URL, cached for 60 s. Returns null if server is between sessions. */
export async function getGpuUrl(): Promise<string | null> {
  if (Date.now() < cacheExpiry && cachedUrl !== undefined) return cachedUrl;
  try {
    const r = await fetch(
      `${SB}/rest/v1/active_nodes?id=eq.0&select=node_url&limit=1`,
      { headers: { apikey: AK, Authorization: `Bearer ${AK}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5_000) },
    );
    if (!r.ok) return null;
    const d = await r.json() as Array<{ node_url?: string | null }>;
    cachedUrl = d[0]?.node_url ?? null;
    cacheExpiry = Date.now() + 60_000;
    return cachedUrl;
  } catch { return null; }
}

/** Health-check: returns true if GPU is up and models are loaded. */
export async function gpuHealthy(): Promise<boolean> {
  const base = await getGpuUrl();
  if (!base) return false;
  try {
    const r = await fetch(`${base}/v1/health`, { signal: AbortSignal.timeout(6_000) });
    if (!r.ok) return false;
    const d = await r.json() as { ok?: boolean };
    return d.ok === true;
  } catch { return false; }
}

/** POST /v1/voice-message — transcribe + AI voice reply */
export interface VoiceMessageResult {
  session_id: string;
  transcript: string;
  reply: { text: string; emoji?: string; audio_path: string };
  reaction?: { mood?: string };
}
export async function gpuVoiceMessage(
  audio: Blob,
  opts: { sessionId?: string; systemPrompt?: string; replyMode?: string } = {},
): Promise<{ base: string; result: VoiceMessageResult } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  const fd = new FormData();
  fd.append("audio", audio, "voice.webm");
  if (opts.sessionId) fd.append("session_id", opts.sessionId);
  if (opts.systemPrompt) fd.append("system_prompt", opts.systemPrompt);
  fd.append("reply_mode", opts.replyMode ?? "voice_text");
  try {
    const r = await fetch(`${base}/v1/voice-message`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    return { base, result: await r.json() as VoiceMessageResult };
  } catch { return null; }
}

/** POST /v1/image — analyze image with optional caption */
export interface ImageAnalyzeResult {
  session_id: string;
  caption_used: string;
  reply: { text: string; emoji?: string; audio_path: string };
  reaction?: { mood?: string };
  image?: { width: number; height: number };
}
export async function gpuImageAnalyze(
  image: Blob,
  opts: { caption?: string; audio?: Blob; sessionId?: string; systemPrompt?: string } = {},
): Promise<{ base: string; result: ImageAnalyzeResult } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  const fd = new FormData();
  fd.append("image", image, "photo.jpg");
  if (opts.caption) fd.append("caption", opts.caption);
  if (opts.audio) fd.append("audio", opts.audio, "caption.webm");
  if (opts.sessionId) fd.append("session_id", opts.sessionId);
  if (opts.systemPrompt) fd.append("system_prompt", opts.systemPrompt);
  try {
    const r = await fetch(`${base}/v1/image`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    return { base, result: await r.json() as ImageAnalyzeResult };
  } catch { return null; }
}

/** POST /v1/voice-preview — TTS: returns audio blob */
export async function gpuVoicePreview(voiceDescription: string, text: string): Promise<Blob | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/v1/voice-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice_description: voiceDescription, text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("audio")) return await r.blob();
    const d = await r.json() as { audio_path?: string };
    if (!d.audio_path) return null;
    const ar = await fetch(`${base}${d.audio_path}`, { signal: AbortSignal.timeout(10_000) });
    return ar.ok ? await ar.blob() : null;
  } catch { return null; }
}

/** POST /v1/image-generate — async image gen; returns job_id. */
export async function gpuImageGenerateSubmit(
  prompt: string,
  opts: { side?: number; ar?: string; seed?: number; image?: Blob; format?: "png" | "jpeg" | "webp" } = {},
): Promise<{ base: string; jobId: string } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  try {
    const { image, ...fields } = opts;
    // With a reference image the endpoint wants multipart/form-data; without one
    // it takes plain JSON. Both share the same job/poll contract.
    const body = image ? (() => {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("image", image, "reference.jpg");
      if (fields.side) form.append("side", String(fields.side));
      if (fields.ar) form.append("ar", fields.ar);
      if (fields.seed !== undefined) form.append("seed", String(fields.seed));
      if (fields.format) form.append("format", fields.format);
      return form;
    })() : JSON.stringify({ prompt, ...fields });
    const response = await fetch(`${base}/v1/image-generate`, {
      method: "POST",
      headers: image ? undefined : { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { job_id?: string };
    return data.job_id ? { base, jobId: data.job_id } : null;
  } catch { return null; }
}

export interface GpuImageJob {
  status: "queued" | "running" | "done" | "failed";
  imageUrl?: string;
  error?: string;
  progress?: number;
  steps?: number;
  queuePosition?: number;
}

/** GET /v1/image-generate/:jobId — poll status. */
export async function gpuImageGeneratePoll(base: string, jobId: string): Promise<GpuImageJob> {
  try {
    const response = await fetch(`${base}/v1/image-generate/${encodeURIComponent(jobId)}`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return { status: "failed", error: `http_${response.status}` };
    const payload = await response.json() as {
      status?: string; error?: string; progress?: number; steps?: number; queue_position?: number;
      result?: { image_url?: string; image_path?: string };
      image_url?: string;
    };
    const status = payload.status === "done" || payload.status === "failed" || payload.status === "queued" || payload.status === "running"
      ? payload.status
      : "failed";
    const imageUrl = payload.result?.image_url ?? (payload.result?.image_path ? `${base}${payload.result.image_path}` : payload.image_url);
    return {
      status,
      imageUrl,
      error: typeof payload.error === "string" ? payload.error : undefined,
      progress: payload.progress,
      steps: payload.steps,
      queuePosition: payload.queue_position,
    };
  } catch {
    // A transient poll failure must not kill the job; report it as still running.
    return { status: "running", error: "network" };
  }
}

/** GET /v1/image-generate — is the model loaded on the GPU node? */
export async function gpuImageReady(): Promise<{ ready: boolean; model: string } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/v1/image-generate`, { signal: AbortSignal.timeout(6_000), cache: "no-store" });
    if (!response.ok) return { ready: false, model: "" };
    const data = await response.json() as { ready?: boolean; model?: string };
    return { ready: data.ready === true, model: data.model ?? "" };
  } catch { return null; }
}

/** DELETE /v1/image-generate/:jobId — free the GPU queue when a job is abandoned. */
export async function gpuImageCancel(base: string, jobId: string): Promise<void> {
  try {
    await fetch(`${base}/v1/image-generate/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(6_000),
    });
  } catch { /* the job expires on its own */ }
}

/**
 * The result URL is only valid while the job lives in GPU memory (~20 min), and
 * it must live on the same tunnel we submitted to. Anything else is rejected so
 * this never becomes an open proxy.
 */
export async function gpuImageDownload(base: string, imageUrl: string): Promise<Response | null> {
  try {
    const target = new URL(imageUrl);
    const origin = new URL(base);
    if (target.protocol !== "https:" || target.host !== origin.host) return null;
    const response = await fetch(target, { signal: AbortSignal.timeout(25_000), cache: "no-store" });
    return response.ok ? response : null;
  } catch { return null; }
}

/** POST /v1/call/session — create a live call session, returns ws URL */
export async function gpuCallSession(
  sessionId: string,
  systemPrompt: string,
  voiceDescription: string,
): Promise<{ sessionId: string; ws: string } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/v1/call/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, system_prompt: systemPrompt, voice_description: voiceDescription }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const d = await r.json() as { session_id: string; ws: string };
    return { sessionId: d.session_id, ws: d.ws };
  } catch { return null; }
}
