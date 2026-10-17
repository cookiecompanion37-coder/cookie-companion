import type { Character } from "@/lib/types";

/** Optional Supabase persistence. Every helper degrades to local-only when env vars are absent. */
export function supabaseConfig(): { url: string; key: string; bucket: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key, bucket: process.env.SUPABASE_BUCKET ?? "cookie-photos" };
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) return null;
  try { return { bytes: Uint8Array.from(Buffer.from(match[2], "base64")), contentType: match[1] }; } catch { return null; }
}

export async function uploadImage(dataUrl: string, folder: string): Promise<string | null> {
  const config = supabaseConfig();
  const parsed = dataUrlToBytes(dataUrl);
  if (!config || !parsed) return null;
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/\/+/g, "/").slice(0, 60) || "misc";
  const path = `${safeFolder}/${crypto.randomUUID()}.${EXT[parsed.contentType] ?? "jpg"}`;
  try {
    const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        apikey: config.key,
        "Content-Type": parsed.contentType,
        "x-upsert": "false",
        "cache-control": "max-age=31536000",
      },
      body: new Blob([parsed.bytes.buffer as ArrayBuffer], { type: parsed.contentType }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    return `${config.url}/storage/v1/object/public/${config.bucket}/${path}`;
  } catch { return null; }
}

interface CharacterRow {
  id: string; name: string; age: number; gender: Character["gender"]; tagline: string; bio: string;
  personality: string; voice: string; greeting: string; accent: string; emoji: string;
  category: Character["category"]; photo: string | null; gallery: string[] | null; appearance: string | null;
}
function readRows(value: unknown): CharacterRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is CharacterRow => typeof row === "object" && row !== null && typeof (row as CharacterRow).id === "string");
}
export async function listSharedCharacters(): Promise<Character[]> {
  const config = supabaseConfig();
  if (!config) return [];
  try {
    const response = await fetch(`${config.url}/rest/v1/characters?select=*&is_public=eq.true&order=created_at.desc&limit=40`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      signal: AbortSignal.timeout(12_000), next: { revalidate: 120 },
    });
    if (!response.ok) return [];
    return readRows(await response.json()).map((row) => ({
      id: `sb-${row.id}`, name: row.name, age: row.age, gender: row.gender, tagline: row.tagline, bio: row.bio,
      personality: row.personality, voice: row.voice, greeting: row.greeting || `hey, I'm ${row.name} ✨`,
      accent: row.accent || "#F19AB8", emoji: row.emoji || "🌷", category: row.category || "Friend",
      chats: 0, creator: "Community", isPublic: true, isMine: false,
      appearance: row.appearance ?? "", photo: row.photo ?? undefined, gallery: row.gallery ?? [], wallpaper: "sakura",
    }));
  } catch { return []; }
}

export async function shareCharacter(character: Character): Promise<boolean> {
  const config = supabaseConfig();
  if (!config) return false;
  try {
    const response = await fetch(`${config.url}/rest/v1/characters?on_conflict=id`, {
      method: "POST",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: character.id.replace(/^sb-/, ""), name: character.name.slice(0, 40), age: character.age, gender: character.gender,
        tagline: character.tagline.slice(0, 80), bio: character.bio.slice(0, 400), personality: character.personality.slice(0, 200),
        voice: character.voice.slice(0, 120), greeting: character.greeting.slice(0, 200), accent: character.accent, emoji: character.emoji,
        category: character.category, photo: character.photo ?? null, gallery: character.gallery.slice(0, 3),
        appearance: character.appearance.slice(0, 600), is_public: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch { return false; }
}

/** Story renders are kept in their own public bucket with a long immutable cache. */
export function storyBucket(): string {
  return process.env.SUPABASE_STORY_BUCKET ?? "cookie-stories";
}

export async function uploadBytes(
  bytes: Uint8Array,
  contentType: string,
  folder: string,
  bucket = storyBucket(),
): Promise<{ url: string; path: string } | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/\/+/g, "/").slice(0, 80) || "misc";
  const path = `${safeFolder}/${crypto.randomUUID()}.${EXT[contentType] ?? "jpg"}`;
  try {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        apikey: config.key,
        "Content-Type": contentType,
        "x-upsert": "false",
        "cache-control": "max-age=31536000, immutable",
      },
      body: new Blob([bytes.buffer as ArrayBuffer], { type: contentType }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    return { url: `${config.url}/storage/v1/object/public/${bucket}/${path}`, path };
  } catch {
    return null;
  }
}

/** Best-effort object delete; used only by the cleanup cron. */
export async function deleteObject(path: string, bucket = storyBucket()): Promise<boolean> {
  const config = supabaseConfig();
  if (!config || !path) return false;
  try {
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
