import { NextResponse } from "next/server";
import { fetchOutput } from "@/lib/server/vmodel";

export const runtime = "nodejs";

/** Streams a VModel output with the server token; output hosts require Authorization. */
export async function GET(request: Request): Promise<NextResponse | Response> {
  const target = new URL(request.url).searchParams.get("u") ?? "";
  const upstream = await fetchOutput(target);
  if (!upstream) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
