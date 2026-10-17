// /api/gpu/call — builds the live-call persona server-side and provisions a GPU WebSocket.
import { NextResponse } from "next/server";
import { getGpuUrl } from "@/lib/server/gpu";
import { buildCallPrompt } from "@/lib/server/prompt";
import type { CharacterBrief } from "@/lib/types";

export const runtime = "nodejs";

function readCharacter(value: unknown): CharacterBrief | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.name !== "string" || typeof data.personality !== "string" || typeof data.voice !== "string") return null;
  if (data.name.length > 80 || data.personality.length > 2000 || data.voice.length > 300) return null;
  return {
    id: data.id.slice(0, 80), name: data.name.slice(0, 80), age: typeof data.age === "number" ? data.age : 22,
    gender: data.gender === "male" || data.gender === "nonbinary" || data.gender === "custom" ? data.gender : "female",
    personality: data.personality.slice(0, 2000), voice: data.voice.slice(0, 300),
    appearance: typeof data.appearance === "string" ? data.appearance.slice(0, 600) : "",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { character?: unknown; user_name?: unknown; memory?: unknown };
    const character = readCharacter(body.character);
    if (!character) return NextResponse.json({ error: "missing_character" }, { status: 400 });
    const userName = typeof body.user_name === "string" ? body.user_name.slice(0, 60) : "friend";
    const memory = Array.isArray(body.memory) ? body.memory.filter((item): item is string => typeof item === "string").slice(0, 10).map((item) => item.slice(0, 80)) : [];
    const systemPrompt = buildCallPrompt(character, userName, memory);

    const base = await getGpuUrl();
    if (!base) return NextResponse.json({ error: "gpu_offline" }, { status: 503 });

    const response = await fetch(`${base}/v1/call/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: `${character.id}-${Date.now().toString(36)}`.slice(0, 80), system_prompt: systemPrompt, voice_description: character.voice }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return NextResponse.json({ error: "gpu_error" }, { status: 502 });
    const data = await response.json() as { session_id?: string; sessionId?: string; ws?: string };
    if (!data.ws) return NextResponse.json({ error: "gpu_error" }, { status: 502 });
    return NextResponse.json({ sessionId: data.session_id ?? data.sessionId ?? character.id, ws: data.ws });
  } catch { return NextResponse.json({ error: "internal" }, { status: 500 }); }
}
