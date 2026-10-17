import type { ChatRequest, ChatResponse, Mood, Reaction } from "@/lib/types";

const DEGRADED: ChatResponse = { bubbles: ["my wifi is being dramatic 😅 say that again?"], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "ok", mood: "neutral", degraded: true };
const MOODS: Mood[] = ["happy", "shy", "sad", "excited", "sleepy", "busy", "neutral"];
const REACTIONS: Reaction[] = ["❤️", "😂", "😮", "🥺", "🔥", "👍", "😘", "✨"];
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function readResponse(value: unknown): ChatResponse | null {
  if (!isRecord(value) || !Array.isArray(value.bubbles) || !Array.isArray(value.memory) || !Array.isArray(value.quickReplies)) return null;
  if (value.bubbles.some((entry) => typeof entry !== "string") || value.memory.some((entry) => typeof entry !== "string") || value.quickReplies.some((entry) => typeof entry !== "string")) return null;
  return {
    bubbles: value.bubbles as string[], reaction: typeof value.reaction === "string" && REACTIONS.includes(value.reaction as Reaction) ? value.reaction as Reaction : null,
    call: value.call === "busy" || value.call === "ring" ? value.call : "none", callbackInSec: typeof value.callbackInSec === "number" ? value.callbackInSec : null,
    memory: value.memory as string[], quickReplies: value.quickReplies as string[], safety: value.safety === "crisis" || value.safety === "minor" ? value.safety : "ok",
    mood: typeof value.mood === "string" && MOODS.includes(value.mood as Mood) ? value.mood as Mood : "neutral", degraded: value.degraded === true,
  };
}

// ── Normal LLM chat (Zero API) — ONLY for text chat mode, never for voice/image GPU paths ──
export async function callChatApi(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal: controller.signal, credentials: "same-origin" });
    if (!response.ok) return DEGRADED;
    const parsed: unknown = await response.json();
    return readResponse(parsed) ?? DEGRADED;
  } catch { return DEGRADED; }
  finally { window.clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
}

// ── GPU voice-message (transcribe + AI voice reply) ─────────────────────────
// Calls /api/gpu/voice → GPU /v1/voice-message. Completely separate from Zero LLM.
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
    return {
      text: d.reply.text,
      emoji: d.reply.emoji,
      audioUrl: d.reply.audio_path ?? "",
      sessionId: d.session_id ?? "",
      transcript: d.transcript ?? "",
    };
  } catch { return null; }
}

// ── GPU image analysis ───────────────────────────────────────────────────────
// Calls /api/gpu/image → GPU /v1/image. Completely separate from Zero LLM.
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
    // audio_path is already an absolute URL (rewritten by the route proxy)
    return { text: d.reply.text, emoji: d.reply.emoji, audioUrl: d.reply.audio_path ?? "", sessionId: d.session_id ?? "", captionUsed: d.caption_used ?? "" };
  } catch { return null; }
}

// ── GPU image generation ─────────────────────────────────────────────────────
export async function callGpuImageGenerate(prompt: string, ar?: string): Promise<string | null> {
  try {
    // Submit
    const sub = await fetch("/api/gpu/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", prompt, ar }), signal: AbortSignal.timeout(15_000) });
    if (!sub.ok) return null;
    const { jobId, base } = await sub.json() as { jobId: string; base: string };
    // Poll up to 30 × 5 s = 150 s
    for (let i = 0; i < 30; i++) {
      await new Promise<void>((res) => setTimeout(res, 5_000));
      const poll = await fetch("/api/gpu/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "poll", jobId, base }), signal: AbortSignal.timeout(8_000) });
      if (!poll.ok) return null;
      const p = await poll.json() as { status: string; image_url?: string };
      if (p.status === "done") return p.image_url ?? null;
      if (p.status === "failed") return null;
    }
    return null;
  } catch { return null; }
}

// ── GPU live call session ────────────────────────────────────────────────────
export async function callGpuCallSession(sessionId: string, systemPrompt: string, voiceDescription: string): Promise<{ sessionId: string; ws: string } | null> {
  try {
    const r = await fetch("/api/gpu/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, system_prompt: systemPrompt, voice_description: voiceDescription }), signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return null;
    return await r.json() as { sessionId: string; ws: string };
  } catch { return null; }
}
