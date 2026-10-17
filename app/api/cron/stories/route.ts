import { NextResponse } from "next/server";
import { isTrustedRequest } from "@/lib/server/admin";
import { runStoryCron, storyStatus } from "@/lib/server/stories";

/**
 * AI story tick. Supabase pg_cron hits this every two minutes (supabase/cron.sql)
 * and the admin panel can trigger it on demand. The daily plan, cap and render
 * jobs are all enforced inside runStoryCron, so a double trigger is harmless.
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isTrustedRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = await storyStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isTrustedRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const result = await runStoryCron({ force, origin: url.origin });
  return NextResponse.json(result, { status: result.ok ? 201 : 200 });
}
