import { NextResponse } from "next/server";
import { isTrustedRequest } from "@/lib/server/admin";
import { cleanupStories } from "@/lib/server/stories";
import { pruneSchedules } from "@/lib/server/calls";

/** Nightly storage + row sweep. 24 h expiry is the whole storage strategy. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isTrustedRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [stories] = await Promise.all([cleanupStories(), pruneSchedules()]);
  return NextResponse.json({ ok: true, ...stories });
}

export const POST = GET;
