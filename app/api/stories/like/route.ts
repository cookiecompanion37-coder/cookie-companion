import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { toggleStoryLike } from "@/lib/server/stories";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { storyId?: string; viewer?: string };
    const viewer = (body.viewer ?? "").trim().slice(0, 64) || "guest";
    const storyId = (body.storyId ?? "").trim();
    if (!storyId) return NextResponse.json({ error: "story_required" }, { status: 400 });
    if (!rateLimit(`like:${viewer}`)) return NextResponse.json({ liked: false, local: true, error: "slow_down" }, { status: 429 });
    const result = await toggleStoryLike(storyId, viewer);
    // `local: true` tells the client to keep the tally on-device (demo mode).
    if (!result) return NextResponse.json({ liked: true, likeCount: 0, local: true });
    return NextResponse.json({ ...result, local: false });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
