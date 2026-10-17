import { NextResponse } from "next/server";
import type { AspectId } from "@/lib/types";
import { ASPECTS, buildPhotoPrompt, createTask, vmodelReady } from "@/lib/server/vmodel";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!vmodelReady()) return NextResponse.json({ error: "image_offline" }, { status: 503 });
  try {
    const body = await request.json() as { scene?: unknown; appearance?: unknown; ar?: unknown; references?: unknown };
    const scene = typeof body.scene === "string" ? body.scene.trim().slice(0, 700) : "";
    const appearance = typeof body.appearance === "string" ? body.appearance.trim().slice(0, 600) : "";
    if (scene.length < 4) return NextResponse.json({ error: "missing_scene" }, { status: 400 });
    const ar: AspectId = ASPECTS.includes(body.ar as AspectId) ? body.ar as AspectId : "4:5";
    const references = Array.isArray(body.references) ? body.references.filter((entry): entry is string => typeof entry === "string").slice(0, 3) : [];
    const task = await createTask(buildPhotoPrompt(scene, appearance, ar), ar, references);
    if (!task) return NextResponse.json({ error: "task_failed" }, { status: 502 });
    return NextResponse.json({ taskId: task.taskId, ar });
  } catch { return NextResponse.json({ error: "internal" }, { status: 500 }); }
}
