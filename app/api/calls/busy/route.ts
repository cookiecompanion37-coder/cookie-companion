import { NextResponse } from "next/server";
import { writeBusyNote } from "@/lib/server/calls";

/**
 * The in-character "I'm busy, I'll call you back" message plus the delay the
 * scheduler should use. One cheap LLM call, hard-clamped to 10–90 minutes.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { characterName?: string; userName?: string; personality?: string };
    if (!body.characterName) return NextResponse.json({ error: "character_required" }, { status: 400 });
    const note = await writeBusyNote(
      body.characterName.slice(0, 40),
      (body.userName ?? "you").slice(0, 40),
      (body.personality ?? "").slice(0, 200),
    );
    return NextResponse.json(note, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
