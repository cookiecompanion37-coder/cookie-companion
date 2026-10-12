interface ProviderMessage { role: "system" | "user" | "assistant"; content: string; }
interface CallOptions { signal?: AbortSignal; }
type ProviderPayload = { choices?: Array<{ message?: { content?: unknown; reasoning?: unknown } }> };

function stripThinking(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/gi, "").trim();
}
function extractContent(payload: ProviderPayload): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return stripThinking(content);
  if (Array.isArray(content)) return stripThinking(content.map((part) => {
    if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
    return "";
  }).join(""));
  return "";
}

export async function callLLM(messages: ProviderMessage[], opts: CallOptions = {}): Promise<string | null> {
  const base = (process.env.ZERO_BASE_URL ?? "https://bflqlfkmfwrtgftvywce.supabase.co/functions/v1/router/v1").replace(/\/+$/, "");
  const key = process.env.ZERO_API_KEY ?? "zerolabs-router-key";
  const model = process.env.ZERO_MODEL ?? "zero-pro-1.2";
  const endpoint = `${base}/chat/completions`;
  const request = async (maxTokens: number): Promise<string | null> => {
    try {
      const response = await fetch(endpoint, {
        method: "POST", signal: opts.signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: .85, max_tokens: maxTokens, stream: false, thinking: false }),
      });
      if (!response.ok) return null;
      const payload = await response.json() as ProviderPayload;
      return extractContent(payload);
    } catch { return null; }
  };
  const first = await request(1024);
  if (first === null) return null;
  if (first.trim()) return first;
  if (opts.signal?.aborted) return null;
  const retry = await request(1500);
  return retry?.trim() ? retry : null;
}

export function recoverJson(raw: string): unknown | null {
  const stripped = stripThinking(raw).replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = stripped.indexOf("{"); const end = stripped.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  const candidate = stripped.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(candidate) as unknown; } catch { return null; }
}
