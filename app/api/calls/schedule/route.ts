import { NextResponse } from "next/server";
import { busyDelayMinutes, pendingCallbacks, recentCallbacks, resolveCallback, scheduleCallback } from "@/lib/server/calls";

/**
 * Callback notes. The rotator writes one when every slot is busy; the calls
 * cron flips it to `ringing`; the app polls this route to raise the ring UI.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER = /^[a-zA-Z0-9_-]{6,64}$/;
const STATUS = new Set(["connected", "missed", "cancelled"] as const);

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const userKey = url.searchParams.get("user") ?? "";
  if (!USER.test(userKey)) return NextResponse.json({ error: "user_required" }, { status: 400 });
  const [ringing, recent] = await Promise.all([pendingCallbacks(userKey), recentCallbacks(userKey)]);
  return NextResponse.json({ ringing, recent }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      action?: string; id?: string; status?: string; characterId?: string; characterName?: string;
      userKey?: string; userName?: string; note?: string; minutes?: number;
    };
    const userKey = body.userKey ?? "";
    if (!USER.test(userKey)) return NextResponse.json({ error: "user_required" }, { status: 400 });

    if (body.action === "resolve") {
      const status = body.status as typeof STATUS extends Set<infer S> ? S : never;
      if (!body.id || !STATUS.has(status as never)) return NextResponse.json({ error: "invalid" }, { status: 400 });
      const ok = await resolveCallback(body.id, status as "connected" | "missed" | "cancelled");
      return NextResponse.json({ ok });
    }

    if (!body.characterId || !body.characterName) return NextResponse.json({ error: "character_required" }, { status: 400 });
    // Callbacks are deliberately short and random; never let a client park one
    // hours out and block the rotator.
    const requested = Number(body.minutes);
    const minutes = Number.isFinite(requested) && requested >= 1
      ? Math.min(8, Math.round(requested))
      : busyDelayMinutes();
    const schedule = await scheduleCallback({
      characterId: body.characterId,
      characterName: body.characterName,
      userKey,
      userName: body.userName ?? "friend",
      dueAt: Date.now() + minutes * 60_000,
      note: body.note ?? "i'll call you back in a bit",
    });
    return NextResponse.json({ schedule }, { status: schedule ? 201 : 502 });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
