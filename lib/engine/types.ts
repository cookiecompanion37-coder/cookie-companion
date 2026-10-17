import type { Reaction } from "@/lib/types";

export type CallPhase = "connecting" | "listening" | "thinking" | "speaking";
export interface CallSession {
  characterId: string;
  phase: CallPhase;
  ai: string;
  user: string;
  seconds: number;
  muted: boolean;
  speaker: boolean;
  level: number;
  /** GPU live-call WebSocket URL — set after callGpuCallSession resolves. Undefined = text fallback. */
  wsUrl?: string;
}
export interface Engine {
  typing: Record<string, boolean>;
  busyUntil: Record<string, number | null>;
  quickReplies: Record<string, string[]>;
  incoming: { characterId: string; direction: "incoming" | "outgoing" } | null;
  call: CallSession | null;
  startChat(characterId: string): void;
  openChat(characterId: string): void;
  send(characterId: string, text: string, opts?: { kind?: "text" | "voice"; durationSec?: number }): void;
  sendPhoto(characterId: string, file: File, caption: string): void;
  sendVoiceNote(characterId: string, blob: Blob | null, durationSec: number): void;
  react(characterId: string, msgId: string, emoji: Reaction | null): void;
  requestCall(characterId: string): void;
  answer(): void;
  decline(): void;
  endCall(): void;
  callTurn(text: string): void;
  setMuted(b: boolean): void;
  setSpeaker(b: boolean): void;
}
