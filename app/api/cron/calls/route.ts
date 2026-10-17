import { NextResponse } from "next/server";
import { isTrustedRequest } from "@/lib/server/admin";
import { processCallCron } from "@/lib/server/calls";

/**
 * Turns due callback notes into rings and expires unanswered rings into missed
 * calls. Cheap: two RPCs, no storage, no LLM.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isTrustedRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await processCallCron();
  return NextResponse.json(result);
}

export const POST = GET;
