import { AI_REACTIONS } from "@/lib/constants";
import type { AspectId, ChatEvent, ChatRequest, ChatResponse, GeneratedImagePlan, Mood, Reaction } from "@/lib/types";
import { precheck } from "@/lib/server/safety";

const MOODS: Mood[] = ["happy", "shy", "sad", "excited", "sleepy", "busy", "neutral"];
const ASPECTS: AspectId[] = ["4:5", "3:4", "1:1", "9:16"];
const EVENTS: ChatEvent[] = ["message", "callback_due", "call_connected", "call_turn", "call_missed", "call_ended"];
const EMOJI = /\p{Extended_Pictographic}/gu;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function shortText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";
}
function stripCallText(value: string): string {
  return value.replace(EMOJI, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/(?:^|\s)[-*+]\s+/g, " ").replace(/[*_`>#~|]/g, "").replace(/\s+/g, " ").trim();
}
function defaults(): ChatResponse {
  return { bubbles: [], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "ok", mood: "neutral", image: null };
}
function readImage(value: unknown, req: ChatRequest): GeneratedImagePlan | null {
  if (!isRecord(value) || !req.allowImage || req.mode !== "chat") return null;
  const prompt = shortText(value.prompt, 600);
  if (prompt.length < 8) return null;
  return { prompt, ar: ASPECTS.includes(value.ar as AspectId) ? value.ar as AspectId : "4:5" };
}

export function sanitize(raw: unknown, req: ChatRequest, rawText: string): ChatResponse {
  const source = isRecord(raw) ? raw : {};
  const result = defaults();
  const looksStructured = /^[\s`]*[\[{]/.test(rawText) || /<(?:tool_call|function_call)|"(?:tool_calls|function_call|arguments)"\s*:/i.test(rawText);
  const fallbackText = looksStructured ? "" : shortText(rawText, 220);
  const incoming = Array.isArray(source.bubbles) ? source.bubbles : fallbackText ? [fallbackText] : [];
  const maxBubbles = req.mode === "call" ? 2 : 3;
  result.bubbles = incoming.map((entry) => shortText(entry, 240)).filter((entry) => Boolean(entry) && !/^(?:```|\s*\{)|<(?:tool_call|function_call)|"tool_calls"\s*:/i.test(entry)).slice(0, maxBubbles);
  if (result.bubbles.length === 0) result.bubbles = [req.mode === "call" ? "i'm here with you." : "i'm here — tell me a little more?"];

  const rawReaction = source.reaction;
  result.reaction = typeof rawReaction === "string" && AI_REACTIONS.includes(rawReaction as Reaction) ? rawReaction as Reaction : null;
  result.memory = Array.isArray(source.memory) ? source.memory.map((item) => shortText(item, 80)).filter(Boolean).slice(0, 2) : [];
  result.quickReplies = Array.isArray(source.quickReplies) ? source.quickReplies.map((item) => shortText(item, 28)).filter(Boolean).slice(0, 3) : [];
  result.mood = typeof source.mood === "string" && MOODS.includes(source.mood as Mood) ? source.mood as Mood : "neutral";
  result.image = readImage(source.image, req);

  const checked = precheck(req);
  result.safety = checked === "minor" ? "minor" : checked === "crisis" ? "crisis" : source.safety === "crisis" || source.safety === "minor" ? source.safety : "ok";
  result.call = source.call === "ring" || source.call === "busy" ? source.call : "none";
  result.callbackInSec = typeof source.callbackInSec === "number" && Number.isFinite(source.callbackInSec) ? Math.min(3600, Math.max(5, Math.floor(source.callbackInSec))) : null;

  // Safety overrides: calls only from user intent, never during crisis/minor, never inside a live call turn.
  if (result.safety !== "ok") result.call = "none";
  if (req.mode !== "chat" || req.event !== "message") result.image = null;
  if (req.event === "call_connected" || req.event === "call_turn") { result.call = "none"; result.callbackInSec = null; }
  if (result.call !== "busy") result.callbackInSec = null;

  if (req.mode === "call") {
    result.bubbles = result.bubbles.map((bubble) => stripCallText(bubble)).filter(Boolean).slice(0, 2).map((bubble) => bubble.split(/\s+/).slice(0, 25).join(" "));
    if (result.bubbles.length === 0) result.bubbles = ["i'm here with you."];
    result.reaction = null; result.call = "none"; result.callbackInSec = null; result.quickReplies = []; result.image = null;
  }
  return result;
}

export function isEvent(value: unknown): value is ChatEvent { return typeof value === "string" && EVENTS.includes(value as ChatEvent); }
