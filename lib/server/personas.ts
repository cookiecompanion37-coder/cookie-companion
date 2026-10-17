import { dbCount, dbDelete, dbInsert, dbReady, dbSelect } from "@/lib/server/db";
import { buildPersona, slug, type AgeBand, type PersonaGender, type PersonaSeed } from "@/lib/server/personaFactory";

/**
 * Admin-only persona factory.
 *
 * Characters are rows, not auth users. Creating 40 of them is one batched
 * insert — no account emails, no onboarding, no extra tables.
 */

export const MAX_AI_PROFILES = Number(process.env.MAX_AI_PROFILES ?? 400);
const PORTRAITS = ["mira", "leo", "sora", "jules", "amaya", "kai", "ines", "tavi", "omar", "ren"];

export interface PersonaStats {
  total: number;
  ai: number;
  publicCount: number;
  remaining: number;
  cap: number;
}

export async function personaStats(): Promise<PersonaStats> {
  if (!dbReady()) {
    return { total: 0, ai: 0, publicCount: 0, remaining: MAX_AI_PROFILES, cap: MAX_AI_PROFILES };
  }
  const [total, aiCount, publicCount] = await Promise.all([
    dbCount("characters", "select=id"),
    dbCount("characters", "select=id&is_ai=eq.true"),
    dbCount("characters", "select=id&is_public=eq.true"),
  ]);
  return {
    total,
    ai: aiCount,
    publicCount,
    remaining: Math.max(0, MAX_AI_PROFILES - aiCount),
    cap: MAX_AI_PROFILES,
  };
}

export interface CreatePersonasInput {
  count: number;
  female: number;
  male: number;
  nonbinary: number;
  ageBand: AgeBand;
  indexOffset?: number;
}

function genderPattern(input: CreatePersonasInput, index: number): PersonaGender {
  const total = Math.max(1, input.female + input.male + input.nonbinary);
  const position = index % total;
  if (position < input.female) return "female";
  if (position < input.female + input.male) return "male";
  return "nonbinary";
}

export async function createPersonas(input: CreatePersonasInput): Promise<{ created: number; personas: PersonaSeed[]; skipped: number }> {
  if (!dbReady()) return { created: 0, personas: [], skipped: input.count };
  const stats = await personaStats();
  const allowed = Math.min(Math.max(0, Math.floor(input.count)), stats.remaining, 60);
  if (allowed === 0) return { created: 0, personas: [], skipped: input.count };

  const start = input.indexOffset ?? stats.ai;
  const personas: PersonaSeed[] = Array.from({ length: allowed }, (_, offset) => {
    const index = start + offset;
    const seed = buildPersona({
      index,
      gender: genderPattern(input, index),
      ageBand: input.ageBand,
      photo: `/characters/${PORTRAITS[index % PORTRAITS.length]}.jpg`,
    });
    return { ...seed, id: `${seed.id}-${(index % 89) + 1}` };
  });

  const unique = personas.filter((persona, index, list) => list.findIndex((entry) => entry.id === persona.id) === index);
  const rows = unique.map((persona) => ({
    id: persona.id.slice(0, 80),
    name: persona.name.slice(0, 40),
    age: persona.age,
    gender: persona.gender,
    tagline: persona.tagline.slice(0, 80),
    bio: `${persona.personality}. ${persona.tagline}.`.slice(0, 400),
    personality: persona.personality.slice(0, 200),
    voice: persona.voice.slice(0, 120),
    greeting: persona.greeting.slice(0, 200),
    accent: persona.accent,
    emoji: persona.emoji,
    category: persona.category,
    photo: persona.photo ?? null,
    gallery: [],
    appearance: persona.appearance.slice(0, 600),
    is_public: true,
    is_ai: true,
    age_band: persona.ageBand,
    creator: "Cookie Studio",
  }));
  const inserted = await dbInsert<{ id: string }>("characters", rows, { onConflict: "id", returning: false });
  void inserted;
  return { created: rows.length, personas: unique, skipped: input.count - rows.length };
}

/** Batch delete used to reset a test batch. Never deletes humans' own rows. */
export async function deleteAiPersonas(limit = 50): Promise<number> {
  if (!dbReady()) return 0;
  const rows = await dbSelect<{ id: string }>("characters", `select=id&is_ai=eq.true&limit=${Math.min(limit, 100)}`, 0);
  if (!rows.length) return 0;
  const ids = rows.map((row) => `"${row.id.replace(/"/g, "")}"`).join(",");
  await dbDelete("characters", `id=in.(${ids})`);
  return rows.length;
}

/** Stable public URL for a persona portrait (used when images are offline). */
export function personaPortrait(name: string): string {
  return `/characters/${PORTRAITS.includes(slug(name)) ? slug(name) : "mira"}.jpg`;
}
