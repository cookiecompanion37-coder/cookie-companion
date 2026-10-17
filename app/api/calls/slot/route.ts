import { NextResponse } from "next/server";
import { claimCallSlot, callSlotStats, heartbeatCallSlot, releaseCallSlot } from "@/lib/server/calls";

/**
 * Concurrency lease for live voice calls: 16 physical slots, 14 usable.
 * The client claims before dialling, heartbeats every 30 s while connected and
 * releases on hang-up. Stale leases expire after 120 s on their own.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION = /^[a-zA-Z0-9_-]{6,80}$/;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await callSlotStats());
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { action?: string; sessionId?: string; characterId?: string };
    const sessionId = body.sessionId ?? "";
    if (!SESSION.test(sessionId)) return NextResponse.json({ error: "session_required" }, { status: 400 });

    if (body.action === "heartbeat") {
      const alive = await heartbeatCallSlot(sessionId);
      return NextResponse.json({ alive, stats: await callSlotStats() });
    }
    if (body.action === "release") {
      await releaseCallSlot(sessionId);
      return NextResponse.json({ released: true, stats: await callSlotStats() });
    }
    const slot = await claimCallSlot(sessionId, body.characterId ?? "companion");
    return NextResponse.json({ slot, stats: await callSlotStats() }, { status: slot ? 200 : 409 });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
