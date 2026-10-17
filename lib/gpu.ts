// GPU server client — fetches live Cloudflare tunnel URL from Supabase and wraps all 5 GPU routes.
// The URL rotates on every Kaggle session; always resolve before each request.

const SB = "https://xiwpzkuuoiwwwkrbphbp.supabase.co";
const AK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd3B6a3V1b2l3d3drcmJwaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxOTU5MTksImV4cCI6MjEwNzc3MTkxOX0.xSZfM1IYdkefsIihLv74N3-wVvt4rlOSMbIgMepvLlI";

let cachedUrl: string | null = null;
let cacheExpiry = 0;

/** Returns the live GPU base URL, cached for 60 s. Returns null if server is between sessions. */
export async function getGpuUrl(): Promise<string | null> {
  if (Date.now() < cacheExpiry && cachedUrl !== undefined) return cachedUrl;
  try {
    const r = await fetch(
      `${SB}/rest/v1/active_nodes?id=eq.0&select=node_url&limit=1`,
      { headers: { apikey: AK, Authorization: `Bearer ${AK}` }, next: { revalidate: 60 } },
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

/** POST /v1/image-generate — async image gen; returns job_id */
export async function gpuImageGenerateSubmit(
  prompt: string,
  opts: { side?: number; ar?: string; seed?: number } = {},
): Promise<{ base: string; jobId: string } | null> {
  const base = await getGpuUrl();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/v1/image-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, ...opts }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const d = await r.json() as { job_id: string };
    return { base, jobId: d.job_id };
  } catch { return null; }
}

/** GET /v1/image-generate/:jobId — poll status */
export async function gpuImageGeneratePoll(
  base: string,
  jobId: string,
): Promise<{ status: "queued" | "running" | "done" | "failed"; image_url?: string; error?: string }> {
  try {
    const r = await fetch(`${base}/v1/image-generate/${jobId}`, { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return { status: "failed", error: "http_error" };
    return await r.json() as { status: "queued" | "running" | "done" | "failed"; image_url?: string };
  } catch { return { status: "failed", error: "network" }; }
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
