"use client";

/**
 * A stable, anonymous per-device id.
 *
 * Social features (story likes, callback notes) need *some* key that survives a
 * reload, but this app has no auth. A random id in localStorage is enough and
 * costs nothing server-side.
 */

const KEY = "cookie:device";
let cached: string | null = null;

function make(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function deviceId(): string {
  if (cached) return cached;
  if (typeof window === "undefined") return "server-render-guest";
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored && /^[a-z0-9]{8,64}$/i.test(stored)) { cached = stored; return stored; }
    const fresh = make();
    window.localStorage.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    cached = make();
    return cached;
  }
}
