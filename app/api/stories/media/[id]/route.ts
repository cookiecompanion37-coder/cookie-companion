import { NextResponse } from "next/server";
import { getStoryMedia } from "@/lib/server/stories";
import { dbConfig } from "@/lib/server/db";

/**
 * CDN-cached story media.
 *
 * Serving images straight from Supabase burns the free 5 GB egress in days at
 * ten thousand viewers. Proxying through this route puts each object on Vercel's
 * edge cache once per region for 24 h — Supabase sees a handful of reads, users
 * see a same-origin image, and nobody hot-links the GPU tunnel.
 */
export const runtime = "nodejs";

/** Only our own storage host is fetchable here (no open proxy). */
function allowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const db = dbConfig();
    if (!db) return false;
    return parsed.protocol === "https:" && parsed.hostname === new URL(db.url).hostname;
  } catch { return false; }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const story = await getStoryMedia(id);
  if (!story || !allowed(story.url)) return new NextResponse("Not found", { status: 404 });
  if (story.expiresAt < Date.now()) return new NextResponse("Expired", { status: 410 });

  try {
    const upstream = await fetch(story.url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok || !upstream.body) return new NextResponse("Not found", { status: 404 });
    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return new NextResponse("Upstream unavailable", { status: 502 });
  }
}
