/**
 * Tiny Supabase REST client.
 *
 * Why not @supabase/supabase-js? The browser bundle stays smaller, the server
 * does not open sockets (REST over fetch), and every call is explicit about the
 * columns it selects — which is the single biggest lever on free-tier egress.
 *
 * Every helper returns null / [] when Supabase is not configured, so the app
 * keeps working in local demo mode.
 */

export interface DbConfig {
  url: string;
  key: string;
}

export function dbConfig(): DbConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function dbReady(): boolean {
  return dbConfig() !== null;
}

const TIMEOUT_MS = 8_000;

function headers(config: DbConfig, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", ...extra };
}

export async function dbSelect<T>(
  table: string,
  query: string,
  revalidate = 30,
): Promise<T[]> {
  const config = dbConfig();
  if (!config) return [];
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
      headers: headers(config),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: revalidate > 0 ? { revalidate } : undefined,
    });
    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

export async function dbInsert<T>(
  table: string,
  rows: unknown,
  options: { returning?: boolean; onConflict?: string; ignoreDuplicates?: boolean } = {},
): Promise<T[]> {
  const config = dbConfig();
  if (!config) return [];
  const prefer = options.returning === false ? "return=minimal" : "return=representation";
  const resolution = options.ignoreDuplicates ? "resolution=ignore-duplicates" : "resolution=merge-duplicates";
  const conflict = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : "";
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}${conflict}`, {
      method: "POST",
      headers: headers(config, { Prefer: options.onConflict ? `${prefer},${resolution}` : prefer }),
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return [];
    if (options.returning === false) return [];
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Exact row count using HEAD + `Prefer: count=exact`. Returns the number from
 * Content-Range without transferring a single row — the free-tier-friendly way
 * to answer "how many personas / posts do we have?".
 */
export async function dbCount(table: string, query: string): Promise<number> {
  const config = dbConfig();
  if (!config) return 0;
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
      method: "HEAD",
      headers: headers(config, { Prefer: "count=exact", Range: "0-0" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return 0;
    const range = response.headers.get("content-range") ?? "";
    const total = Number(range.split("/")[1]);
    return Number.isFinite(total) ? total : 0;
  } catch { return 0; }
}

export async function dbPatch(table: string, query: string, patch: unknown): Promise<boolean> {
  const config = dbConfig();
  if (!config) return false;
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: headers(config, { Prefer: "return=minimal" }),
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function dbDelete(table: string, query: string): Promise<number> {
  const config = dbConfig();
  if (!config) return 0;
  try {
    const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
      method: "DELETE",
      headers: headers(config, { Prefer: "count=exact", "Content-Range": "0-0" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return 0;
    const range = response.headers.get("content-range") ?? "";
    const total = Number(range.split("/")[1]);
    return Number.isFinite(total) ? total : 0;
  } catch {
    return 0;
  }
}

export async function dbRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const config = dbConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as T;
    return data ?? null;
  } catch {
    return null;
  }
}

/** PostgREST `in.(…)` list with quoting kept in one place. */
export function inList(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replace(/"/g, "")}"`).join(",")})`;
}
