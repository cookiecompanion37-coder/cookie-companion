export type Reaction = "❤️" | "😂" | "😮" | "🥺" | "🔥" | "👍" | "😘" | "✨";
export type Gender = "female" | "male" | "nonbinary" | "custom";
export type Category = "Trending" | "Romance" | "Friend" | "Anime" | "Mentor" | "Funny";
export type Mood = "happy" | "shy" | "sad" | "excited" | "sleepy" | "busy" | "neutral";
export type PlanId = "free" | "plus" | "max";
export type Stage = "welcome" | "signin" | "onboarding" | "main";
export type WallpaperId = "sakura" | "cotton" | "dusk" | "matcha" | "peach" | "midnight";
export type AspectId = "4:5" | "3:4" | "1:1" | "9:16";

export interface Character {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  tagline: string;
  bio: string;
  personality: string;
  voice: string;
  greeting: string;
  accent: string;
  emoji: string;
  category: Category;
  chats: number;
  creator: string;
  isPublic: boolean;
  isMine: boolean;
  /** Free-text look description used as the base for generated photos. */
  appearance: string;
  /** Main portrait (bundled path, data URL, or Supabase public URL). */
  photo?: string;
  /** Extra reference shots used to keep generated photos consistent. */
  gallery: string[];
  wallpaper?: WallpaperId;
}

export interface MsgReaction { emoji: Reaction; by: "user" | "ai"; }
export type MsgKind = "text" | "voice" | "crisis" | "note";
export type MsgStatus = "sent" | "delivered" | "seen";

export interface GeneratedImage {
  prompt: string;
  ar: AspectId;
  status: "pending" | "ready" | "failed";
  url?: string;
}

export interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  kind: MsgKind;
  text: string;
  ts: number;
  status?: MsgStatus;
  reactions: MsgReaction[];
  durationSec?: number;
  /** A photo the user attached or the companion generated. */
  image?: GeneratedImage;
}

export interface Chat { characterId: string; messages: Msg[]; unread: number; pinned: boolean; sent: number; lastTs: number; }
export interface CallLog { id: string; characterId: string; direction: "incoming" | "outgoing"; outcome: "answered" | "missed" | "declined"; startedAt: number; durationSec: number; }
export interface Credits { dayKey: string; textsUsed: number; callSecondsToday: number; bonusCallSeconds: number; planCallSecondsUsed: number; packCallSeconds: number; }
export interface Settings { haptics: boolean; sounds: boolean; captions: boolean; reduceMotion: boolean; }
export interface Session { name: string; email: string; vibe: string; interests: string[]; }

export interface AppState {
  stage: Stage;
  session: Session | null;
  ageConfirmed: boolean;
  plan: PlanId;
  credits: Credits;
  chats: Record<string, Chat>;
  customCharacters: Character[];
  sharedCharacters: Character[];
  memory: Record<string, string[]>;
  calls: CallLog[];
  settings: Settings;
  wallpaper: WallpaperId;
  characterWallpapers: Record<string, WallpaperId>;
}

export type ChatEvent = "message" | "callback_due" | "call_connected" | "call_turn" | "call_missed" | "call_ended";

export interface CharacterBrief {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  personality: string;
  voice: string;
  appearance: string;
  photo?: string;
}

export interface ChatRequest {
  character: CharacterBrief;
  userName: string;
  messages: { role: "user" | "assistant"; text: string }[];
  event: ChatEvent;
  mode: "chat" | "call";
  memory: string[];
  callState: { status: "idle" | "busy"; secondsLeft: number; busyRoll: boolean; callsToday: number };
  localTime: string;
  callSeconds?: number;
  /** Whether the companion may offer/generate a photo on this turn. */
  allowImage: boolean;
}

export interface GeneratedImagePlan { prompt: string; ar: AspectId; }

export interface ChatResponse {
  bubbles: string[];
  reaction: Reaction | null;
  call: "none" | "busy" | "ring";
  callbackInSec: number | null;
  memory: string[];
  quickReplies: string[];
  safety: "ok" | "crisis" | "minor";
  mood: Mood;
  image: GeneratedImagePlan | null;
  degraded?: boolean;
}
