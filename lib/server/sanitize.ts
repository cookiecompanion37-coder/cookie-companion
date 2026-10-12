import { AI_REACTIONS } from "@/lib/constants";
import { clamp, rand } from "@/lib/utils";
import type { ChatRequest, ChatResponse, Mood, Reaction } from "@/lib/types";
import { precheck, userAskedForCall } from "@/lib/server/safety";

const MOODS: Mood[] = ["happy", "shy", "sad", "excited", "sleepy", "busy", "neutral"];
const EMOJI = /\p{Extended_Pictographic}/gu;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function shortText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";
}
function stripCallText(value: string): string {
  return value.replace(EMOJI, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/(?:^|\s)[-*+]\s+/g, " ").replace(/[*_`>#~|]/g, "").replace(/\s+/g, " ").trim();
}
function defaults(): ChatResponse { return { bubbles: [], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "ok", mood: "neutral" }; }

export function sanitize(raw: unknown, req: ChatRequest, rawText: string): ChatResponse {
  const source = isRecord(raw) ? raw : {};
  const result = defaults();
  const fallbackText = shortText(rawText, 220);
  const incoming = Array.isArray(source.bubbles) ? source.bubbles : fallbackText ? [fallbackText] : [];
  const maxBubbles = req.mode === "call" ? 2 : 3;
  result.bubbles = incoming.map((entry) => shortText(entry, 220)).filter(Boolean).slice(0, maxBubbles);
  if (result.bubbles.length === 0) result.bubbles = [req.mode === "call" ? "i'm here with you." : "i'm here — tell me a little more?"];

  const rawReaction = source.reaction;
  result.reaction = typeof rawReaction === "string" && AI_REACTIONS.includes(rawReaction as Reaction) ? rawReaction as Reaction : null;
  result.memory = Array.isArray(source.memory) ? source.memory.map((item) => shortText(item, 80)).filter(Boolean).slice(0, 2) : [];
  result.quickReplies = Array.isArray(source.quickReplies) ? source.quickReplies.map((item) => shortText(item, 28)).filter(Boolean).slice(0, 3) : [];
  result.mood = typeof source.mood === "string" && MOODS.includes(source.mood as Mood) ? source.mood as Mood : "neutral";
  const checked = precheck(req);
  result.safety = checked === "minor" ? "minor" : checked === "crisis" ? "crisis" : source.safety === "crisis" || source.safety === "minor" ? source.safety : "ok";
  result.call = source.call === "ring" || source.call === "busy" ? source.call : "none";
  result.callbackInSec = typeof source.callbackInSec === "number" && Number.isFinite(source.callbackInSec) ? Math.floor(source.callbackInSec) : null;

  const lastUserText = [...req.messages].reverse().find((message) => message.role === "user")?.text ?? "";
  const askedForCall = userAskedForCall(lastUserText);
  if (req.event === "callback_due") result.call = "ring";
  else if ((req.callState.busyRoll || req.callState.status === "busy") && result.call === "ring") result.call = "busy";
  if (req.event === "message" && !askedForCall && result.call === "ring") result.call = "none";
  if (req.event !== "callback_due" && !askedForCall && result.call === "ring") result.call = "none";
  if (askedForCall && (req.callState.busyRoll || req.callState.status === "busy") && result.call !== "ring") result.call = "busy";
  if (result.call === "busy") {
    result.callbackInSec = req.callState.status === "busy" ? clamp(req.callState.secondsLeft, 1, 25) : clamp(result.callbackInSec ?? rand(10, 25), 10, 25);
  } else result.callbackInSec = null;

  if (req.mode === "call") {
    result.bubbles = result.bubbles.map((bubble) => stripCallText(bubble)).filter(Boolean).slice(0, 2).map((bubble) => bubble.split(/\s+/).slice(0, 25).join(" "));
    if (result.bubbles.length === 0) result.bubbles = ["i'm here with you."];
    result.reaction = null; result.call = "none"; result.callbackInSec = null; result.quickReplies = [];
  }
  return result;
}
