export type Reaction = "❤️" | "😂" | "😮" | "🥺" | "🔥" | "👍" | "😘" | "✨";
export type Gender = "female" | "male" | "nonbinary" | "custom";
export type Category = "Trending" | "Romance" | "Friend" | "Anime" | "Mentor" | "Funny";
export type Mood = "happy" | "shy" | "sad" | "excited" | "sleepy" | "busy" | "neutral";
export type PlanId = "free" | "plus" | "max";
export type Stage = "welcome" | "signin" | "onboarding" | "main";
export interface Character { id: string; name: string; age: number; gender: Gender; tagline: string; bio: string; personality: string; voice: string; greeting: string; accent: string; emoji: string; category: Category; chats: number; creator: string; isPublic: boolean; isMine: boolean; }
export interface MsgReaction { emoji: Reaction; by: "user" | "ai"; }
export type MsgKind = "text" | "voice" | "crisis" | "note";
export type MsgStatus = "sent" | "delivered" | "seen";
export interface Msg { id: string; role: "user" | "assistant" | "system"; kind: MsgKind; text: string; ts: number; status?: MsgStatus; reactions: MsgReaction[]; durationSec?: number; }
export interface Chat { characterId: string; messages: Msg[]; unread: number; pinned: boolean; sent: number; lastTs: number; }
export interface CallLog { id: string; characterId: string; direction: "incoming" | "outgoing"; outcome: "answered" | "missed" | "declined"; startedAt: number; durationSec: number; }
export interface Credits { dayKey: string; textsUsed: number; callSecondsToday: number; bonusCallSeconds: number; planCallSecondsUsed: number; packCallSeconds: number; }
export interface Settings { haptics: boolean; sounds: boolean; captions: boolean; reduceMotion: boolean; }
export interface Session { name: string; vibe: string; interests: string[]; }
export interface AppState { stage: Stage; session: Session | null; ageConfirmed: boolean; plan: PlanId; credits: Credits; chats: Record<string, Chat>; customCharacters: Character[]; memory: Record<string, string[]>; calls: CallLog[]; settings: Settings; }
export type ChatEvent = "message" | "callback_due" | "call_connected" | "call_turn" | "call_missed" | "call_ended";
export interface ChatRequest { character: Pick<Character, "name" | "age" | "gender" | "personality" | "voice">; userName: string; messages: { role: "user" | "assistant"; text: string }[]; event: ChatEvent; mode: "chat" | "call"; memory: string[]; callState: { status: "idle" | "busy"; secondsLeft: number; busyRoll: boolean; callsToday: number }; localTime: string; callSeconds?: number; }
export interface ChatResponse { bubbles: string[]; reaction: Reaction | null; call: "none" | "busy" | "ring"; callbackInSec: number | null; memory: string[]; quickReplies: string[]; safety: "ok" | "crisis" | "minor"; mood: Mood; degraded?: boolean; }
