// /api/gpu/call — creates a GPU live-call session and returns the WebSocket URL.
// The client opens the WS directly (no server-side WS proxy needed).
import { NextResponse } from "next/server";
import { getGpuUrl } from "@/lib/gpu";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { session_id?: unknown; system_prompt?: unknown; voice_description?: unknown };
    const session_id = typeof body.session_id === "string" ? body.session_id.slice(0, 80) : "";
    const system_prompt = typeof body.system_prompt === "string" ? body.system_prompt.slice(0, 2000) : "";
    const voice_description = typeof body.voice_description === "string" ? body.voice_description.slice(0, 200) : "";
    if (!session_id || !system_prompt || !voice_description) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const base = await getGpuUrl();
    if (!base) return NextResponse.json({ error: "gpu_offline" }, { status: 503 });

    const r = await fetch(`${base}/v1/call/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, system_prompt, voice_description }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return NextResponse.json({ error: "gpu_error" }, { status: 502 });
    const d = await r.json() as { session_id: string; ws: string };
    // Return the WS URL — client connects directly (GPU WS cannot be server-proxied)
    return NextResponse.json({ sessionId: d.session_id, ws: d.ws });
  } catch { return NextResponse.json({ error: "internal" }, { status: 500 }); }
}
