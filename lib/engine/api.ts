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
