// /api/gpu/tts — server-side proxy for GPU /v1/voice-preview
// Keeps the GPU URL off the client; returns raw WAV bytes.
import { NextResponse } from "next/server";
import { getGpuUrl } from "@/lib/server/gpu";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { voice_description?: unknown; text?: unknown };
    const voice_description = typeof body.voice_description === "string" ? body.voice_description.slice(0, 200) : "";
    const text = typeof body.text === "string" ? body.text.slice(0, 500) : "";
    if (!voice_description || !text) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

    const base = await getGpuUrl();
    if (!base) return NextResponse.json({ error: "gpu_offline" }, { status: 503 });

    const r = await fetch(`${base}/v1/voice-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice_description, text }),
      signal: AbortSignal.timeout(22_000),
    });
    if (!r.ok) return NextResponse.json({ error: "gpu_error" }, { status: 502 });

    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("audio")) {
      const buf = await r.arrayBuffer();
      return new NextResponse(buf, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    }
    // JSON path — fetch the audio file and proxy it
    const d = await r.json() as { audio_path?: string };
    if (!d.audio_path) return NextResponse.json({ error: "no_audio" }, { status: 502 });
    const ar = await fetch(`${base}${d.audio_path}`, { signal: AbortSignal.timeout(10_000) });
    if (!ar.ok) return NextResponse.json({ error: "audio_fetch_failed" }, { status: 502 });
    const buf = await ar.arrayBuffer();
    return new NextResponse(buf, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "internal" }, { status: 500 }); }
}
