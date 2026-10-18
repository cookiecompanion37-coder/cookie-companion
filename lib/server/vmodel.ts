import type { AspectId } from "@/lib/types";
import { photographyPrompt } from "@/lib/eternal-engine/photography";

const API = process.env.VMODEL_BASE_URL ?? "https://api.vmodel.ai";
export const VMODEL_VERSION = process.env.VMODEL_VERSION ?? "cce611c44553ba5f061813d75a1e5f93d8c901047528da275f667ebe7d784565";

export interface TaskResult {
  taskId: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[];
  error: string;
}

export function vmodelReady(): boolean { return Boolean(process.env.VMODEL_API_TOKEN); }

export const ASPECTS: AspectId[] = ["4:5", "3:4", "1:1", "9:16"];

export function buildPhotoPrompt(scene: string, appearance: string, aspect: AspectId): string {
  return photographyPrompt({ scene, appearance, aspect });
}

export async function createTask(prompt: string, aspect: AspectId, references: string[] = []): Promise<TaskResult | null> {
  const token = process.env.VMODEL_API_TOKEN;
  if (!token) return null;
  const refs = references.filter((url) => /^https?:\/\//i.test(url)).slice(0, 3);
  try {
    const response = await fetch(`${API}/api/tasks/v1/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: VMODEL_VERSION,
        input: { prompt, img_urls: refs, model_variant: "flare", aspect_ratio: aspect, resolution: "1k" },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { code?: number; result?: { task_id?: string } };
    const taskId = data.result?.task_id;
    return taskId ? { taskId, status: "starting", output: [], error: "" } : null;
  } catch { return null; }
}

export async function getTask(taskId: string): Promise<TaskResult | null> {
  const token = process.env.VMODEL_API_TOKEN;
  if (!token || !/^[a-z0-9_-]{6,64}$/i.test(taskId)) return null;
  try {
    const response = await fetch(`${API}/api/tasks/v1/get/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000), cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json() as { result?: { task_id?: string; status?: string; output?: unknown; error?: unknown } };
    const result = data.result;
    if (!result) return null;
    const status = result.status === "succeeded" || result.status === "failed" || result.status === "canceled" || result.status === "processing" ? result.status : "starting";
    return {
      taskId, status,
      output: Array.isArray(result.output) ? result.output.filter((entry): entry is string => typeof entry === "string") : [],
      error: typeof result.error === "string" ? result.error : "",
    };
  } catch { return null; }
}

const ALLOWED_HOSTS = ["vmodel.ai", "replicate.delivery", "pbxt.replicate.delivery"];
export function allowedOutputHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

export async function fetchOutput(url: string): Promise<Response | null> {
  const token = process.env.VMODEL_API_TOKEN;
  if (!token || !allowedOutputHost(url)) return null;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000), cache: "no-store" });
    return response.ok ? response : null;
  } catch { return null; }
}
