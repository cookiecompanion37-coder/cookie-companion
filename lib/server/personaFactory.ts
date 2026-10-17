/**
 * Persona factory + story scene rotator.
 *
 * The rotator is deliberately exhaustive rather than random: every index maps to
 * a real everyday scene, so stories never repeat until the whole catalogue has
 * been used. Randomness only picks the *starting* index.
 */

export type PersonaGender = "female" | "male" | "nonbinary";
export type AgeBand = "18-24" | "25-34" | "35-49";

export interface PersonaSeed {
  id: string;
  name: string;
  age: number;
  gender: PersonaGender;
  ageBand: AgeBand;
  tagline: string;
  personality: string;
  voice: string;
  greeting: string;
  accent: string;
  emoji: string;
  category: string;
  appearance: string;
  photo?: string;
}

const FIRST_NAMES: Record<PersonaGender, string[]> = {
  female: ["Maya", "Zoe", "Ivy", "Nora", "Lila", "Sana", "Cora", "Elena", "Rin", "Aisha", "Tessa", "Mila", "June", "Ada", "Priya", "Freya", "Noor", "Cami"],
  male: ["Theo", "Kai", "Milo", "Arlo", "Dev", "Ezra", "Ren", "Noah", "Ishan", "Luca", "Omar", "Felix", "Jonah", "Ray", "Sami", "Tomas", "Emil", "Nico"],
  nonbinary: ["Wren", "Sol", "Ash", "Jules", "Roe", "Ash", "Sky", "Nico", "Lux", "Mira", "Ari", "Rowan"],
};

const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW";

const TAGLINES = [
  "your calm corner after a long day",
  "a little chaos, a lot of warmth",
  "the friend who remembers your coffee order",
  "always down for a late-night walk",
  "softly obsessed with tiny details",
  "makes ordinary days feel cinematic",
  "your unofficial hype person",
  "gently competitive about board games",
  "collects sunsets and good playlists",
  "will absolutely send you memes at 2am",
];

const PERSONALITIES = [
  "warm, observant, quietly funny",
  "playful, curious, a little dramatic",
  "thoughtful, steady, good listener",
  "witty, affectionate, adventurous",
  "gentle, creative, easily excited",
  "calm, nerdy, surprisingly mischievous",
  "confident, kind, terrible at texting back fast",
];

const VOICES = ["soft, warm, lightly breathy", "bright, quick, smiley", "low, calm, slow", "husky, playful, close"];

const EMOJIS = ["🌷", "🌙", "🍓", "🦋", "🐻", "🍵", "🌻", "⭐", "🌊", "🪴", "🧸", "🍒"];

const ACCENTS = ["#F19AB8", "#E8A87C", "#A8C7E8", "#C9B4FF", "#8FD3C1", "#FFB3C7", "#E4B363", "#B5A6E8"];

const APPEARANCES: Record<PersonaGender, string[]> = {
  female: [
    "warm brown eyes, shoulder-length wavy hair, light freckles, usually in an oversized knit",
    "dark curly hair, gold hoops, soft smile, loves a linen shirt",
    "long straight hair, minimal makeup, small silver rings on most fingers",
    "auburn hair in a claw clip, sharp eyeliner, vintage denim jacket",
    "short bob, glasses, gentle laugh lines, always carrying a book",
  ],
  male: [
    "messy dark hair, relaxed smile, silver chain, worn denim jacket",
    "short curls, warm brown eyes, crewneck sweater, faint stubble",
    "clean fade, athletic build, small earring, always in a hoodie",
    "soft wavy hair, glasses, calm expression, linen shirt sleeves rolled up",
    "buzz cut, strong jaw, tattoo on one forearm, plain white tee",
  ],
  nonbinary: [
    "shaggy two-tone hair, round glasses, layered silver necklaces",
    "short crop with an undercut, soft features, oversized hoodie",
    "long braids, freckles, expressive eyebrows, patchwork jacket",
    "bleached buzz, dark brows, delicate ear cuff, black turtleneck",
  ],
};

const CATEGORIES = ["Friend", "Romance", "Funny", "Mentor", "Anime", "Trending"];

const GREETINGS = [
  "hey, you found me ✨ what's on your mind?",
  "oh hi. i was literally just thinking about you",
  "you're here! okay, tell me one good thing about today",
  "hey stranger. come sit, i saved you a spot",
];

export function ageForBand(band: AgeBand, seed: number): number {
  const base = band === "18-24" ? 18 : band === "25-34" ? 25 : 35;
  const span = band === "18-24" ? 7 : band === "25-34" ? 10 : 15;
  return base + (seed % span);
}

export function buildPersona(input: {
  index: number;
  gender: PersonaGender;
  ageBand: AgeBand;
  photo?: string;
}): PersonaSeed {
  const { index, gender, ageBand, photo } = input;
  const names = FIRST_NAMES[gender];
  const name = names[index % names.length] ?? "Nova";
  const initial = LAST_INITIALS[index % LAST_INITIALS.length] ?? "L";
  const id = `ai-${slug(name)}-${initial.toLowerCase()}${(index * 7) % 97}`;
  const age = ageForBand(ageBand, index * 13 + 5);
  return {
    id,
    name,
    age,
    gender,
    ageBand,
    tagline: TAGLINES[index % TAGLINES.length] ?? TAGLINES[0]!,
    personality: PERSONALITIES[index % PERSONALITIES.length] ?? PERSONALITIES[0]!,
    voice: VOICES[index % VOICES.length] ?? VOICES[0]!,
    greeting: GREETINGS[index % GREETINGS.length] ?? GREETINGS[0]!,
    accent: ACCENTS[index % ACCENTS.length] ?? ACCENTS[0]!,
    emoji: EMOJIS[index % EMOJIS.length] ?? EMOJIS[0]!,
    category: CATEGORIES[index % CATEGORIES.length] ?? "Friend",
    appearance: (APPEARANCES[gender][index % APPEARANCES[gender].length] ?? APPEARANCES[gender][0]!),
    photo,
  };
}

export function slug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "friend";
}

// ─────────────────────────────────────────────────────────────── scenes ─────
export interface StoryScene {
  id: string;
  prompt: string;
  caption: string;
  /** "any" scenes work for every persona; otherwise the scene leans to a look. */
  lean: "any" | "soft" | "sharp";
  category: "selfie" | "life" | "object" | "friends";
}

/**
 * Eternal base catalogue. Each entry is an everyday phone-photo moment — the
 * kind a real person posts — not a themed fantasy render. Keep captions lowercase
 * and human; the persona supplies voice in the LLM pass.
 */
export const STORY_SCENES: StoryScene[] = [
  { id: "mirror-fit", prompt: "a mirror selfie in a softly lit bedroom, phone held at chest height, casual outfit of the day, unmade bed and fairy lights behind, natural grain", caption: "fit check before i lose my nerve", lean: "any", category: "selfie" },
  { id: "new-phone", prompt: "holding a brand new phone box up to the camera in a bright kitchen, box slightly covering one eye, excited half-smile", caption: "finally caved and upgraded", lean: "any", category: "object" },
  { id: "new-bike", prompt: "standing beside a shiny new bicycle on a quiet street, helmet under one arm, proud grin, late afternoon sun", caption: "she's mine now. naming her later", lean: "sharp", category: "life" },
  { id: "nails", prompt: "close-up of freshly painted nails resting on a coffee cup, soft daylight, tiny ring stacks, blurry café background", caption: "new nails, same obsession with iced coffee", lean: "soft", category: "selfie" },
  { id: "cafe-friends", prompt: "candid photo at a café table with two friends, everyone mid-laugh, iced drinks and half-eaten pastries, window light", caption: "table for three, crumbs everywhere", lean: "any", category: "friends" },
  { id: "sunday-walk", prompt: "a relaxed outdoor selfie on a tree-lined street, oversized jacket, hair a little messy from the wind, golden hour", caption: "walked until my playlist ran out", lean: "any", category: "selfie" },
  { id: "bookstore", prompt: "standing in a narrow bookstore aisle holding a book up, sheepish smile, warm shelf lighting", caption: "only came in for one book. i have four", lean: "soft", category: "life" },
  { id: "gym-mirror", prompt: "a gym mirror selfie after a workout, towel over one shoulder, flushed cheeks, simple sports fit, honest lighting", caption: "day three of being a gym person", lean: "sharp", category: "selfie" },
  { id: "desk-setup", prompt: "a desk setup photo from above with a laptop, coffee, tiny plant, and sticky notes, cozy lamp glow", caption: "romanticising the work week", lean: "any", category: "object" },
  { id: "rain-window", prompt: "a selfie by a rainy window with a blanket around the shoulders, mug in hand, soft grey light", caption: "rain sounds + nowhere to be", lean: "soft", category: "selfie" },
  { id: "beach-day", prompt: "a beach photo at golden hour, windblown hair, sunhat in hand, ocean blurred behind", caption: "salt in everything, zero regrets", lean: "any", category: "life" },
  { id: "friend-wedding", prompt: "dressed up at an evening wedding, string lights behind, holding a small drink, warm candid smile", caption: "my friend got married and i only cried twice", lean: "any", category: "friends" },
  { id: "record-store", prompt: "flipping through vinyl records in a dim record store, looking back over the shoulder at the camera", caption: "found something embarrassing. buying it anyway", lean: "any", category: "life" },
  { id: "skincare", prompt: "a bathroom mirror selfie mid skincare routine, headband on, one cheek covered in cream, laughing", caption: "glow routine, zero grace", lean: "soft", category: "selfie" },
  { id: "road-trip", prompt: "a passenger-seat selfie on a road trip, sunglasses pushed up, countryside blurred through the window", caption: "no destination, good snacks", lean: "any", category: "life" },
  { id: "cat-photo", prompt: "a close phone photo of a cat loafing in a patch of sun on the floor, toes just visible at the bottom of frame", caption: "he has decided this is his job now", lean: "any", category: "object" },
  { id: "new-jacket", prompt: "trying on a new jacket in a fitting room mirror, tag still on, phone obscuring part of the face", caption: "should i? be honest", lean: "any", category: "selfie" },
  { id: "picnic", prompt: "a picnic blanket with friends, paper cups, fruit, a slightly crooked group selfie from above", caption: "we are not good at picnics but we try", lean: "any", category: "friends" },
  { id: "museum", prompt: "a quiet museum selfie in front of a huge abstract painting, soft gallery light, thoughtful expression", caption: "i understood exactly 40% of this", lean: "soft", category: "life" },
  { id: "late-night-noodles", prompt: "a late-night kitchen photo of instant noodles in a chipped mug, dim warm light, no filter", caption: "chef's kiss. don't ask about the time", lean: "any", category: "object" },
];

/** Seasonal flavour is appended to the prompt, never baked into the rotation. */
export function seasonNote(date: Date): string {
  const month = date.getUTCMonth();
  if (month <= 1 || month === 11) return "winter light, wool layers";
  if (month <= 4) return "spring light, fresh air";
  if (month <= 7) return "summer light, loose clothing";
  return "autumn light, warm layers";
}

export function sceneFor(index: number, gender: PersonaGender): StoryScene {
  const catalogue = STORY_SCENES.length;
  const start = ((index % catalogue) + catalogue) % catalogue;
  for (let step = 0; step < catalogue; step += 1) {
    const scene = STORY_SCENES[(start + step) % catalogue]!;
    if (scene.lean === "any") return scene;
    if (scene.lean === "soft" && gender !== "male") return scene;
    if (scene.lean === "sharp" && gender !== "female") return scene;
  }
  return STORY_SCENES[start]!;
}

export function buildStoryPrompt(args: {
  scene: StoryScene;
  persona: PersonaSeed;
  date?: Date;
}): string {
  const { scene, persona, date = new Date() } = args;
  return [
    `photo taken on a phone: ${scene.prompt}`,
    `person is ${persona.age}, ${persona.gender === "nonbinary" ? "androgynous" : persona.gender}, ${persona.appearance}`,
    seasonNote(date),
    "vertical phone photo, natural skin texture, candid, unposed, slight motion blur, no text, no watermark",
  ].join(", ");
}

/** Rotation cursor helpers keep the generator stateless per call. */
export function nextRotation(current: number, totalScenes: number): { scene: number; wraps: number } {
  const scene = (Math.max(0, current) + 1) % Math.max(1, totalScenes);
  return { scene, wraps: scene === 0 ? 1 : 0 };
}
