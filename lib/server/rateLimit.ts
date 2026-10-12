const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requests = new Map<string, { startedAt: number; count: number }>();

export function rateLimit(key: string): boolean {
  const now = Date.now();
  if (requests.size > 1000) {
    for (const [ip, entry] of requests) if (now - entry.startedAt >= WINDOW_MS) requests.delete(ip);
  }
  const current = requests.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) { requests.set(key, { startedAt: now, count: 1 }); return true; }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}
