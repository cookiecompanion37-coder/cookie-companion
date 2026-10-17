import { NextResponse } from "next/server";
import { getTask, vmodelReady } from "@/lib/server/vmodel";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  if (!vmodelReady()) return NextResponse.json({ status: "failed", reason: "image_offline" });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ status: "failed", reason: "missing_id" }, { status: 400 });
  const task = await getTask(id);
  if (!task) return NextResponse.json({ status: "failed", reason: "task_not_found" });
  if (task.status === "failed" || task.status === "canceled") return NextResponse.json({ status: "failed" });
  if (task.status === "succeeded" && task.output[0]) {
    return NextResponse.json({ status: "ready", url: `/api/image/file?u=${encodeURIComponent(task.output[0])}` });
  }
  return NextResponse.json({ status: "pending" });
}
