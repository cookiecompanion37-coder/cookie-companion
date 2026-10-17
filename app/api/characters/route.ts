import { NextResponse } from "next/server";
import type { Character } from "@/lib/types";
import { listSharedCharacters, shareCharacter, supabaseConfig } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const characters = await listSharedCharacters();
  return NextResponse.json({ characters, shared: supabaseConfig() !== null });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as Partial<Character>;
    if (!body.id || !body.name || !body.personality) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const character: Character = {
      id: body.id, name: body.name, age: body.age ?? 22, gender: body.gender ?? "custom",
      tagline: body.tagline ?? "a companion made with love", bio: body.bio ?? "", personality: body.personality,
      voice: body.voice ?? "soft, warm", greeting: body.greeting ?? "hey ✨", accent: body.accent ?? "#F19AB8",
      emoji: body.emoji ?? "🌷", category: body.category ?? "Friend", chats: 0, creator: body.creator ?? "Community",
      isPublic: true, isMine: false, appearance: body.appearance ?? "", photo: body.photo, gallery: body.gallery ?? [], wallpaper: body.wallpaper,
    };
    const ok = await shareCharacter(character);
    return NextResponse.json({ ok, shared: supabaseConfig() !== null });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
