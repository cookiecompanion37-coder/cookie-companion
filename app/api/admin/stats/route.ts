import { NextResponse } from "next/server";
import { adminDefaults, adminSession } from "@/lib/server/admin";
import { callSlotStats } from "@/lib/server/calls";
import { personaStats } from "@/lib/server/personas";
import { storyStatus } from "@/lib/server/stories";
import { dbReady } from "@/lib/server/db";

/** Everything the admin dashboard shows, in one request. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const session = adminSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [personas, stories, calls] = await Promise.all([personaStats(), storyStatus(), callSlotStats()]);
  return NextResponse.json(
    { email: session.email, defaults: adminDefaults(), db: dbReady(), personas, stories, calls },
    { headers: { "Cache-Control": "no-store" } },
  );
}
