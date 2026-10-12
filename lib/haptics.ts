import { getState } from "@/lib/store";

export function haptic(kind: "tap" | "send" | "react" | "ring" | "success"): void {
  if (typeof navigator === "undefined" || !getState().settings.haptics || typeof navigator.vibrate !== "function") return;
  const patterns: Record<typeof kind, number | number[]> = { tap: 8, send: [10, 20, 12], react: [8, 18, 8], ring: [140, 180, 140, 500], success: [15, 35, 20] };
  try { navigator.vibrate(patterns[kind]); } catch { /* Haptics may be blocked by browser policy. */ }
}
