import { clamp, rand } from "@/lib/utils";

export const BATCH_IDLE_MS = 900;
export function seenDelay(): number { return rand(700, 1800); }
export function deliveredDelay(): number { return rand(500, 900); }
export function preTypingDelay(isFirst: boolean): number { return isFirst ? rand(400, 1200) : rand(250, 700); }
export function typingDuration(text: string, isFirst: boolean): number {
  return isFirst ? clamp(500 + text.length * 35, 700, 2800) : clamp(300 + text.length * 25, 500, 1800);
}
export function rollBusy(_callsToday: number, _firstEver: boolean): boolean { return false; }
