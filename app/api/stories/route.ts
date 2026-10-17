import { NextResponse, after } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { createStory, listStories, runStoryCron } from "@/lib/server/stories";
import { dbReady } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function viewerKey(request: Request): string {
  const raw = request.headers.get("x-viewer") ?? "";
  return /^[a-zA-Z0-9_-]{8,64}$/.test(raw) ? raw : "guest";
}

/**
 * Opportunistic factory tick. pg_cron owns the real schedule, but if this
 * instance has not tried for two minutes we let the feed request nudge the
 * pipeline after its response is sent. It is safe to lose these ticks.
 */
let lastNudge = 0;
function maybeNudge(origin: string): void {
  if (!dbReady() || Date.now() - lastNudge < 120_000) return;
  lastNudge = Date.now();
  after(async () => {
    try { await runStoryCron({ origin }); } catch { /* the next tick retries */ }
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 24);
  const before = Number(url.searchParams.get("before") ?? 0);
  const stories = await listStories({ limit: Number.isFinite(limit) ? limit : 24, before: before > 0 ? before : undefined });

  maybeNudge(url.origin);

  // The feed is public and identical for everyone, so the CDN can absorb almost
  // all traffic. Likes stay per-device on top of these counts.
  return NextResponse.json(
    { stories, source: dbReady() ? "live" : "demo" },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!rateLimit(`story:${viewerKey(request)}`)) return NextResponse.json({ error: "slow_down" }, { status: 429 });
  try {
    const body = await request.json() as {
      mediaUrl?: string; mediaPath?: string; caption?: string; scene?: string;
      authorName?: string; authorEmoji?: string; authorAccent?: string; authorId?: string;
    };
    if (!body.mediaUrl) return NextResponse.json({ error: "media_required" }, { status: 400 });
    const story = await createStory({
      authorId: body.authorId ?? viewerKey(request),
      authorName: body.authorName ?? "You",
      authorEmoji: body.authorEmoji ?? "🌷",
      authorAccent: body.authorAccent ?? "#F19AB8",
      mediaUrl: body.mediaUrl,
      mediaPath: body.mediaPath,
      caption: body.caption,
      scene: body.scene ?? "your-moment",
      isAi: false,
    });
    if (!story) return NextResponse.json({ error: "failed" }, { status: 502 });
    return NextResponse.json({ story }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
