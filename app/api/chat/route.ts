import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/lib/types";
import { precheck } from "@/lib/server/safety";
import { buildSystemPrompt } from "@/lib/server/prompt";
import { callLLM, recoverJson } from "@/lib/server/llm";
import { sanitize } from "@/lib/server/sanitize";
import { rateLimit } from "@/lib/server/rateLimit";

const FALLBACK: ChatResponse = { bubbles: ["my wifi is being dramatic 😅 say that again?"], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "ok", mood: "neutral", degraded: true };
const MINOR: ChatResponse = { bubbles: ["thanks for telling me. Cookie is only for adults, so I can’t continue this chat. Please talk with a trusted adult if you need support."], reaction: null, call: "none", callbackInSec: null, memory: [], quickReplies: [], safety: "minor", mood: "neutral" };
const EVENTS = new Set(["message", "callback_due", "call_connected", "call_turn", "call_missed", "call_ended"]);
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function validRequest(value: unknown): value is ChatRequest {
  if (!isRecord(value) || !isRecord(value.character) || !Array.isArray(value.messages) || !isRecord(value.callState)) return false;
  const { character, messages, callState } = value;
  const charValid = typeof character.name === "string" && character.name.length <= 80 && typeof character.personality === "string" && character.personality.length <= 2000 && typeof character.voice === "string" && character.voice.length <= 500 && typeof character.age === "number" && Number.isFinite(character.age) && character.age >= 18 && character.age <= 120 && ["female", "male", "nonbinary", "custom"].includes(String(character.gender));
  const messagesValid = messages.length <= 24 && messages.every((entry) => isRecord(entry) && (entry.role === "user" || entry.role === "assistant") && typeof entry.text === "string" && entry.text.length <= 4000);
  const callsValid = (callState.status === "idle" || callState.status === "busy") && typeof callState.secondsLeft === "number" && Number.isFinite(callState.secondsLeft) && callState.secondsLeft >= 0 && callState.secondsLeft <= 86_400 && typeof callState.busyRoll === "boolean" && typeof callState.callsToday === "number" && Number.isFinite(callState.callsToday) && callState.callsToday >= 0;
  return charValid && messagesValid && callsValid && typeof value.userName === "string" && value.userName.length <= 80 && EVENTS.has(String(value.event)) && (value.mode === "chat" || value.mode === "call") && Array.isArray(value.memory) && value.memory.length <= 12 && value.memory.every((item) => typeof item === "string" && item.length <= 80) && typeof value.localTime === "string" && value.localTime.length <= 100 && (value.callSeconds === undefined || typeof value.callSeconds === "number" && Number.isFinite(value.callSeconds) && value.callSeconds >= 0 && value.callSeconds <= 86_400);
}
function fallbackResponse(safety: ChatResponse["safety"] = "ok"): NextResponse { return NextResponse.json({ ...FALLBACK, safety }, { status: 200 }); }
async function readLimitedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    if (!part.value) continue;
    size += part.value.byteLength;
    if (size > 20_480) { await reader.cancel(); return null; }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request): Promise<NextResponse> {
  let detectedSafety: ChatResponse["safety"] = "ok";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(ip)) return fallbackResponse();
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 20_480) return fallbackResponse();
    const body = await readLimitedBody(request);
    if (body === null) return fallbackResponse();
    const value: unknown = JSON.parse(body);
    if (!validRequest(value)) return fallbackResponse();
    detectedSafety = precheck(value);
    if (detectedSafety === "minor") return NextResponse.json(MINOR, { status: 200 });

    const promptMessages = [
      { role: "system" as const, content: buildSystemPrompt(value) },
      ...value.messages.map((message) => ({ role: message.role, content: message.text })),
    ];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28_000);
    try {
      const raw = await callLLM(promptMessages, { signal: controller.signal });
      if (!raw) return fallbackResponse(detectedSafety);
      const recovered = recoverJson(raw);
      const response = sanitize(recovered, value, recovered ? "" : raw);
      return NextResponse.json(response, { status: 200 });
    } finally { clearTimeout(timeout); }
  } catch { return fallbackResponse(detectedSafety === "crisis" ? "crisis" : "ok"); }
}
