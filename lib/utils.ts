export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function cn(...parts: (string | false | null | undefined)[]): string { return parts.filter(Boolean).join(" "); }
export function clamp(n: number, min: number, max: number): number { return Math.min(max, Math.max(min, n)); }
export function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
export function formatTime(sec: number): string { const safe = Math.max(0, Math.floor(sec)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`; }
export function timeAgo(ts: number): string {
  const delta = Math.max(0, Date.now() - ts);
  if (delta < 60_000) return "now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(ts);
}
