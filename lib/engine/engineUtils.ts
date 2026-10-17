import { SEED_CHARACTERS } from "@/lib/seed";
import type { AppState, CallLog, Character, Chat, CharacterBrief, ChatEvent, ChatRequest, Mood, Msg, MsgStatus } from "@/lib/types";
import { uid } from "@/lib/utils";

export function findCharacter(state: AppState, characterId: string): Character | undefined {
  return state.customCharacters.find((character) => character.id === characterId)
    ?? state.sharedCharacters.find((character) => character.id === characterId)
    ?? SEED_CHARACTERS.find((character) => character.id === characterId);
}
export function allCharacters(state: AppState): Character[] { return [...state.customCharacters, ...state.sharedCharacters, ...SEED_CHARACTERS]; }
export function brief(character: Character): CharacterBrief {
  return { id: character.id, name: character.name, age: character.age, gender: character.gender, personality: character.personality, voice: character.voice, appearance: character.appearance, photo: character.photo };
}
export function emptyChat(characterId: string): Chat { return { characterId, messages: [], unread: 0, pinned: false, sent: 0, lastTs: 0 }; }
export function newMessage(role: Msg["role"], text: string, kind: Msg["kind"] = "text", durationSec?: number): Msg {
  return { id: uid(), role, kind, text, ts: Date.now(), reactions: [], ...(durationSec === undefined ? {} : { durationSec }) };
}
export function appendMessage(state: AppState, characterId: string, msg: Msg, unread = false, sent = false): AppState {
  const chat = state.chats[characterId] ?? emptyChat(characterId);
  return { ...state, chats: { ...state.chats, [characterId]: { ...chat, messages: [...chat.messages, msg], unread: unread ? chat.unread + 1 : chat.unread, sent: chat.sent + (sent ? 1 : 0), lastTs: msg.ts } } };
}
export function patchMessage(state: AppState, characterId: string, msgId: string, patch: Partial<Msg>): AppState {
  const chat = state.chats[characterId];
  if (!chat) return state;
  return { ...state, chats: { ...state.chats, [characterId]: { ...chat, messages: chat.messages.map((msg) => msg.id === msgId ? { ...msg, ...patch } : msg) } } };
}
export function setMessageStatus(state: AppState, characterId: string, msgId: string, status: MsgStatus): AppState {
  return patchMessage(state, characterId, msgId, { status });
}
export function buildHistory(chat: Chat | undefined): ChatRequest["messages"] {
  if (!chat) return [];
  const lines: ChatRequest["messages"] = [];
  for (const message of chat.messages.slice(-24)) {
    if (message.role === "system") continue;
    const role = message.role === "assistant" ? "assistant" : "user";
    const text = message.image
      ? `[shared a photo${message.image.prompt ? `: ${message.image.prompt.slice(0, 80)}` : ""}] ${message.text}`.trim()
      : message.kind === "voice" ? `[voice note, ${message.durationSec ?? 0}s] ${message.text}`
      : message.text;
    lines.push({ role, text });
    if (message.role === "user") for (const reaction of message.reactions.filter((entry) => entry.by === "user")) lines.push({ role: "user", text: `[user reacted ${reaction.emoji} to: "${message.text.slice(0, 80)}"]` });
  }
  return lines.slice(-24);
}
export function localTime(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset(); const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0"); const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  return `${date}T${time}${sign}${hours}:${minutes}`;
}
export function callsToday(calls: CallLog[]): number {
  const today = new Date();
  return calls.filter((call) => { const date = new Date(call.startedAt); return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate(); }).length;
}
export function makeRequest(
  state: AppState,
  character: Character,
  characterId: string,
  event: ChatEvent,
  mode: "chat" | "call",
  busyRoll: boolean,
  secondsLeft: number,
  callsTodayCount: number,
  callSeconds?: number,
): ChatRequest {
  const chat = state.chats[characterId];
  return {
    character: brief(character),
    userName: state.session?.name ?? "friend",
    messages: buildHistory(chat), event, mode,
    memory: (state.memory[characterId] ?? []).slice(0, 12),
    callState: { status: secondsLeft > 0 ? "busy" : "idle", secondsLeft, busyRoll, callsToday: callsTodayCount },
    localTime: localTime(),
    allowImage: mode === "chat" && event === "message",
    ...(callSeconds === undefined ? {} : { callSeconds }),
  };
}
export function storeCall(state: AppState, log: CallLog): AppState { return { ...state, calls: [log, ...state.calls].slice(0, 200) }; }
export function patchCall(state: AppState, logId: string, patch: Partial<CallLog>): AppState { return { ...state, calls: state.calls.map((log) => log.id === logId ? { ...log, ...patch } : log) }; }
export function moodFromChat(chat: Chat | undefined): Mood { return chat && chat.messages.length > 0 ? "happy" : "neutral"; }
