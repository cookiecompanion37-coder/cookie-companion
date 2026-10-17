import type { AspectId, Category, PlanId, Reaction } from "@/lib/types";

export const REACTIONS: Reaction[] = ["❤️", "😂", "😮", "🥺", "🔥", "👍"];
export const AI_REACTIONS: Reaction[] = ["❤️", "😂", "😮", "🥺", "🔥", "👍", "😘", "✨"];

export const PLANS: Record<PlanId, { id: PlanId; name: string; priceMonthly: number; priceAnnual: number; textsPerDay: number; callSecondsPerMonth: number; maxCharacters: number; perks: string[] }> = {
  free: { id: "free", name: "Free", priceMonthly: 0, priceAnnual: 0, textsPerDay: 40, callSecondsPerMonth: 0, maxCharacters: 2, perks: ["40 chats each day", "One cozy companion"] },
  plus: { id: "plus", name: "Cookie+", priceMonthly: 9.99, priceAnnual: 71.99, textsPerDay: 400, callSecondsPerMonth: 7200, maxCharacters: 6, perks: ["400 chats each day", "2 hours of calls monthly", "Up to 6 companions"] },
  max: { id: "max", name: "Cookie Max", priceMonthly: 19.99, priceAnnual: 143.99, textsPerDay: 9999, callSecondsPerMonth: 24000, maxCharacters: 20, perks: ["Unlimited fair-use chats", "6 hours 40 minutes of calls", "Up to 20 companions"] },
};
export const PACKS = [{ minutes: 30, price: 2.99 }, { minutes: 90, price: 7.99 }, { minutes: 240, price: 17.99 }];
export const FREE_TEXTS_PER_DAY = 40;
export const FREE_CALL_SECONDS_PER_DAY = 300;
export const WELCOME_BONUS_SECONDS = 600;
export const CALL_RING_SEC = 25;
export const BOND_THRESHOLDS = [0, 10, 40, 100, 250];
export const CRISIS_RESOURCES = [
  { label: "988 (United States)", detail: "Call or text 988 for the Suicide & Crisis Lifeline." },
  { label: "14416 (India)", detail: "Call Tele-MANAS for 24/7 mental health support." },
  { label: "116 123 (United Kingdom)", detail: "Call Samaritans, free to reach any time." },
  { label: "findahelpline.com", detail: "Find a verified support line in your country." },
];
export const CATEGORIES: Category[] = ["Trending", "Romance", "Friend", "Anime", "Mentor", "Funny"];
export const VIBES = ["Cozy", "Playful", "Thoughtful", "Adventurous", "Soft-hearted", "Low-key"];
export const INTERESTS = ["Music", "Books", "Art", "Gaming", "Food", "Movies", "Travel", "Nature", "Fitness", "Learning"];
export const VOICE_PRESETS: { name: string; description: string }[] = [
  { name: "Soft", description: "soft, warm, and gentle" },
  { name: "Bright", description: "bright, clear, and upbeat" },
  { name: "Husky", description: "low, warm, slightly raspy" },
  { name: "Calm", description: "calm, measured, and soothing" },
  { name: "Energetic", description: "lively, expressive, and quick" },
];
export const ACCENTS = ["#F19AB8", "#A98BEA", "#F2A66F", "#71B8C8", "#87BD8C", "#E27C78", "#6F91D7", "#D68ABF"];
export const AVATAR_EMOJIS = ["🌷", "🌙", "🍓", "🦋", "🐻", "🐸", "🦊", "🐱", "🐰", "⭐", "🍵", "🌻"];

export const LOOK_CHIPS = ["long wavy hair", "short curls", "soft freckles", "round glasses", "warm smile", "tattoo sleeve", "silver earrings", "dimples", "buzz cut", "braids"];
export const OUTFIT_CHIPS = ["cream knit sweater", "oversized hoodie", "vintage denim jacket", "linen shirt", "black turtleneck", "floral sundress", "athleisure", "tailored blazer"];
export const ASPECTS: { id: AspectId; label: string; hint: string }[] = [
  { id: "4:5", label: "Portrait", hint: "feed photo" },
  { id: "3:4", label: "Classic", hint: "selfie" },
  { id: "1:1", label: "Square", hint: "profile" },
  { id: "9:16", label: "Story", hint: "full body" },
];
