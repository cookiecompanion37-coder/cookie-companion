// /api/gpu/voice — server-side proxy for GPU /v1/voice-message
// POST multipart: audio (file) + optional session_id, system_prompt, reply_mode
// Returns JSON: { session_id, transcript, reply: { text, emoji, audio_path }, reaction }
// audio_path is rewritten to absolute BASE URL so client can fetch directly.
import { NextResponse } from "next/server";
import { getGpuUrl } from "@/lib/server/gpu";

function err(msg: string, status = 500) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const base = await getGpuUrl();
    if (!base) return err("gpu_offline", 503);

    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) return err("expected_multipart", 400);

    const form = await request.formData();
    const audio = form.get("audio");
    if (!audio || !(audio instanceof File)) return err("missing_audio", 400);
    if (audio.size > 10 * 1024 * 1024) return err("audio_too_large", 413);

    const fd = new FormData();
    fd.append("audio", audio);
    const sessionId = form.get("session_id");
    const systemPrompt = form.get("system_prompt");
    const replyMode = form.get("reply_mode");
    if (typeof sessionId === "string" && sessionId) fd.append("session_id", sessionId.slice(0, 80));
    if (typeof systemPrompt === "string" && systemPrompt) fd.append("system_prompt", systemPrompt.slice(0, 2000));
    fd.append("reply_mode", typeof replyMode === "string" && replyMode ? replyMode : "voice_text");

    const r = await fetch(`${base}/v1/voice-message`, { method: "POST", body: fd, signal: AbortSignal.timeout(35_000) });
    if (!r.ok) return err("gpu_error", 502);
    const d = await r.json() as Record<string, unknown>;

    // Rewrite audio_path to absolute URL so client can fetch directly
    if (d.reply && typeof d.reply === "object") {
      const reply = d.reply as Record<string, unknown>;
      if (typeof reply.audio_path === "string" && reply.audio_path.startsWith("/")) {
        reply.audio_path = `${base}${reply.audio_path}`;
      }
    }
    return NextResponse.json(d);
  } catch { return err("internal"); }
}
