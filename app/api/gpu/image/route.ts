// /api/gpu/image — server-side proxy for GPU image analysis and image generation
// POST with { action: "analyze", ... } or { action: "generate", ... } or { action: "poll", ... }
import { NextResponse } from "next/server";
import { getGpuUrl } from "@/lib/server/gpu";

function err(msg: string, status = 500) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(request: Request): Promise<NextResponse> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data") && !ct.includes("application/json")) {
    return err("unsupported_content_type", 415);
  }
  try {

    // ── Image Analysis: multipart FormData ──────────────────────────────────
    if (ct.includes("multipart/form-data")) {
      const base = await getGpuUrl();
      if (!base) return err("gpu_offline", 503);
      const form = await request.formData();
      const image = form.get("image");
      if (!image || !(image instanceof File)) return err("missing_image", 400);
      if (image.size > 20 * 1024 * 1024) return err("image_too_large", 413);

      const fd = new FormData();
      fd.append("image", image);
      const caption = form.get("caption");
      const audio = form.get("audio");
      const sessionId = form.get("session_id");
      if (typeof caption === "string" && caption) fd.append("caption", caption.slice(0, 500));
      if (audio instanceof File) fd.append("audio", audio);
      if (typeof sessionId === "string" && sessionId) fd.append("session_id", sessionId);

      const r = await fetch(`${base}/v1/image`, { method: "POST", body: fd, signal: AbortSignal.timeout(35_000) });
      if (!r.ok) return err("gpu_error", 502);
      const d = await r.json() as Record<string, unknown>;
      // Rewrite audio_path to absolute URL so client can fetch it
      if (d.reply && typeof d.reply === "object") {
        const reply = d.reply as Record<string, unknown>;
        if (typeof reply.audio_path === "string") reply.audio_path = `${base}${reply.audio_path}`;
      }
      return NextResponse.json(d);
    }

    // ── JSON actions: generate submit or poll ────────────────────────────────
    let body: { action?: unknown; prompt?: unknown; jobId?: unknown; base?: unknown; side?: unknown; ar?: unknown; seed?: unknown };
    try { body = await request.json(); } catch { return err("invalid_json", 400); }
    const action = body.action;

    if (action === "generate") {
      const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 800) : "";
      if (!prompt) return err("missing_prompt", 400);
      const gpuBase = await getGpuUrl();
      if (!gpuBase) return err("gpu_offline", 503);
      const payload: Record<string, unknown> = { prompt };
      if (typeof body.side === "number") payload.side = body.side;
      if (typeof body.ar === "string") payload.ar = body.ar;
      if (typeof body.seed === "number") payload.seed = body.seed;
      const r = await fetch(`${gpuBase}/v1/image-generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) return err("gpu_error", 502);
      const d = await r.json() as { job_id: string };
      return NextResponse.json({ jobId: d.job_id, base: gpuBase });
    }

    if (action === "poll") {
      const jobId = typeof body.jobId === "string" ? body.jobId : "";
      const gpuBase = typeof body.base === "string" ? body.base : await getGpuUrl();
      if (!jobId || !gpuBase) return err("missing_params", 400);
      const r = await fetch(`${gpuBase}/v1/image-generate/${jobId}`, { signal: AbortSignal.timeout(8_000) });
      if (!r.ok) return err("gpu_error", 502);
      return NextResponse.json(await r.json());
    }

    return err("unknown_action", 400);
  } catch { return err("internal"); }
}
