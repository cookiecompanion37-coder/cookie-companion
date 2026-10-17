import type { AspectId, ChatRequest, ChatResponse, Mood, Reaction } from "@/lib/types";

const DEGRADED: ChatResponse = { bubbles: ["my wifi is being dramatic 😅 say that again?"], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "ok", mood: "neutral", image: null, degraded: true };
const MOODS: Mood[] = ["happy", "shy", "sad", "excited", "sleepy", "busy", "neutral"];
const REACTIONS: Reaction[] = ["❤️", "😂", "😮", "🥺", "🔥", "👍", "😘", "✨"];
const ASPECTS: AspectId[] = ["4:5", "3:4", "1:1", "9:16"];
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function readImage(value: unknown): ChatResponse["image"] {
  if (!isRecord(value) || typeof value.prompt !== "string" || !value.prompt.trim()) return null;
  return { prompt: value.prompt.trim().slice(0, 600), ar: ASPECTS.includes(value.ar as AspectId) ? value.ar as AspectId : "4:5" };
}
function readResponse(value: unknown): ChatResponse | null {
  if (!isRecord(value) || !Array.isArray(value.bubbles) || !Array.isArray(value.memory) || !Array.isArray(value.quickReplies)) return null;
  if (value.bubbles.some((entry) => typeof entry !== "string") || value.memory.some((entry) => typeof entry !== "string") || value.quickReplies.some((entry) => typeof entry !== "string")) return null;
  return {
    bubbles: value.bubbles as string[], reaction: typeof value.reaction === "string" && REACTIONS.includes(value.reaction as Reaction) ? value.reaction as Reaction : null,
    call: value.call === "busy" || value.call === "ring" ? value.call : "none", callbackInSec: typeof value.callbackInSec === "number" ? value.callbackInSec : null,
    memory: value.memory as string[], quickReplies: value.quickReplies as string[], safety: value.safety === "crisis" || value.safety === "minor" ? value.safety : "ok",
    mood: typeof value.mood === "string" && MOODS.includes(value.mood as Mood) ? value.mood as Mood : "neutral",
    image: readImage(value.image), degraded: value.degraded === true,
  };
}

/** Text chat only — /api/chat (Zero router). Voice turns during live calls use the GPU socket. */
export async function callChatApi(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal: controller.signal, credentials: "same-origin" });
    if (!response.ok) return DEGRADED;
    return readResponse(await response.json() as unknown) ?? DEGRADED;
  } catch { return DEGRADED; }
  finally { window.clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
}

// ── Photo pipeline: VModel create → poll → authenticated file proxy ──────────
export interface PhotoTask { taskId: string; }
export async function submitPhoto(opts: { scene: string; appearance: string; ar: AspectId; references?: string[] }): Promise<PhotoTask | null> {
  try {
    const response = await fetch("/api/image/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { taskId?: string };
    return data.taskId ? { taskId: data.taskId } : null;
  } catch { return null; }
}
export async function pollPhoto(taskId: string): Promise<{ status: "pending" | "ready" | "failed"; url?: string }> {
  try {
    const response = await fetch(`/api/image/status?id=${encodeURIComponent(taskId)}`, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!response.ok) return { status: "failed" };
    return await response.json() as { status: "pending" | "ready" | "failed"; url?: string };
  } catch { return { status: "pending" }; }
}
/** Wait for a generated photo. Returns the authenticated proxy URL. */
export async function awaitPhoto(taskId: string, onTick?: (seconds: number) => void): Promise<string | null> {
  for (let step = 0; step < 45; step += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2400));
    const result = await pollPhoto(taskId);
    if (result.status === "ready") return result.url ?? null;
    if (result.status === "failed") return null;
    onTick?.(step * 2);
  }
  return null;
}

/** Persist a browser-compressed data URL. Supabase-backed when configured, otherwise local. */
export async function persistImage(dataUrl: string, folder: string): Promise<string> {
  if (!dataUrl) return "";
  try {
    const response = await fetch("/api/storage/upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, folder }), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return dataUrl;
    const data = await response.json() as { url?: string };
    return data.url || dataUrl;
  } catch { return dataUrl; }
}

// ── GPU voice-message (transcribe + AI voice reply) ─────────────────────────
export interface GpuVoiceReply { text: string; emoji?: string; audioUrl: string; sessionId: string; transcript: string; }
export async function callGpuVoiceMessage(
  audio: Blob,
  opts: { sessionId?: string; systemPrompt?: string; replyMode?: string } = {},
): Promise<GpuVoiceReply | null> {
  try {
    const fd = new FormData();
    fd.append("audio", audio, "voice.webm");
    if (opts.sessionId) fd.append("session_id", opts.sessionId);
    if (opts.systemPrompt) fd.append("system_prompt", opts.systemPrompt.slice(0, 2000));
    fd.append("reply_mode", opts.replyMode ?? "voice_text");
    const r = await fetch("/api/gpu/voice", { method: "POST", body: fd, signal: AbortSignal.timeout(38_000) });
    if (!r.ok) return null;
    const d = await r.json() as { session_id?: string; transcript?: string; reply?: { text?: string; emoji?: string; audio_path?: string } };
    if (!d.reply?.text) return null;
    return { text: d.reply.text, emoji: d.reply.emoji, audioUrl: d.reply.audio_path ?? "", sessionId: d.session_id ?? "", transcript: d.transcript ?? "" };
  } catch { return null; }
}

// ── GPU image analysis ───────────────────────────────────────────────────────
export interface GpuImageReply { text: string; emoji?: string; audioUrl: string; sessionId: string; captionUsed: string; }
export async function callGpuImageApi(
  image: File,
  opts: { caption?: string; sessionId?: string } = {},
): Promise<GpuImageReply | null> {
  try {
    const fd = new FormData();
    fd.append("image", image);
    if (opts.caption) fd.append("caption", opts.caption.slice(0, 500));
    if (opts.sessionId) fd.append("session_id", opts.sessionId.slice(0, 80));
    const r = await fetch("/api/gpu/image", { method: "POST", body: fd, signal: AbortSignal.timeout(38_000) });
    if (!r.ok) return null;
    const d = await r.json() as { session_id?: string; caption_used?: string; reply?: { text?: string; emoji?: string; audio_path?: string } };
    if (!d.reply?.text) return null;
    return { text: d.reply.text, emoji: d.reply.emoji, audioUrl: d.reply.audio_path ?? "", sessionId: d.session_id ?? "", captionUsed: d.caption_used ?? "" };
  } catch { return null; }
}

// ── GPU live call session ────────────────────────────────────────────────────
export async function callGpuCallSession(
  character: { id: string; name: string; personality: string; voice: string; appearance: string },
  userName: string,
  memory: string[],
): Promise<{ sessionId: string; ws: string } | null> {
  try {
    const r = await fetch("/api/gpu/call", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character, user_name: userName, memory: memory.slice(0, 10) }),
      signal: AbortSignal.timeout(14_000),
    });
    if (!r.ok) return null;
    return await r.json() as { sessionId: string; ws: string };
  } catch { return null; }
}
