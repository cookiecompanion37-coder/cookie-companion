import { NextResponse } from "next/server";
import { adminSession } from "@/lib/server/admin";
import { createPersonas, deleteAiPersonas, personaStats } from "@/lib/server/personas";
import type { AgeBand } from "@/lib/server/personaFactory";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BANDS: AgeBand[] = ["18-24", "25-34", "35-49"];

export async function GET(request: Request): Promise<NextResponse> {
  if (!adminSession(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await personaStats());
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!adminSession(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as {
      count?: number; female?: number; male?: number; nonbinary?: number; ageBand?: string;
    };
    const count = Math.min(60, Math.max(1, Math.floor(Number(body.count) || 1)));
    const female = Math.max(0, Math.floor(Number(body.female) || 0));
    const male = Math.max(0, Math.floor(Number(body.male) || 0));
    const nonbinary = Math.max(0, Math.floor(Number(body.nonbinary) || 0));
    const ageBand = BANDS.includes(body.ageBand as AgeBand) ? (body.ageBand as AgeBand) : "25-34";
    if (female + male + nonbinary === 0) return NextResponse.json({ error: "gender_required" }, { status: 400 });
    const result = await createPersonas({ count, female, male, nonbinary, ageBand });
    return NextResponse.json({ ...result, stats: await personaStats() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!adminSession(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const removed = await deleteAiPersonas(50);
  return NextResponse.json({ removed, stats: await personaStats() });
}
