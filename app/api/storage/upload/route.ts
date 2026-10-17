import { NextResponse } from "next/server";
import { supabaseConfig, uploadImage } from "@/lib/server/supabase";

export const runtime = "nodejs";

/** Stores a browser-compressed image. Falls back to the data URL when Supabase isn't configured. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 3_500_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const body = await request.json() as { dataUrl?: unknown; folder?: unknown };
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    if (!dataUrl.startsWith("data:image/") || dataUrl.length > 2_800_000) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const folder = typeof body.folder === "string" ? body.folder : "misc";
    if (!supabaseConfig()) return NextResponse.json({ url: dataUrl, stored: false });
    const url = await uploadImage(dataUrl, folder);
    if (!url) return NextResponse.json({ url: dataUrl, stored: false });
    return NextResponse.json({ url, stored: true });
  } catch { return NextResponse.json({ error: "internal" }, { status: 500 }); }
}
