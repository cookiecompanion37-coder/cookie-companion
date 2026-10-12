import { FREE_CALL_SECONDS_PER_DAY, FREE_TEXTS_PER_DAY, PLANS, WELCOME_BONUS_SECONDS } from "@/lib/constants";
import type { AppState } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function dayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function refillIfNewDay(s: AppState): AppState {
  const today = dayKey();
  if (s.credits.dayKey === today) return s;
  const oldMonth = s.credits.dayKey.slice(0, 7);
  const newMonth = today.slice(0, 7);
  return { ...s, credits: { ...s.credits, dayKey: today, textsUsed: 0, callSecondsToday: 0, planCallSecondsUsed: oldMonth && oldMonth !== newMonth ? 0 : s.credits.planCallSecondsUsed } };
}
export function textsLimit(s: AppState): number { return s.plan === "free" ? FREE_TEXTS_PER_DAY : PLANS[s.plan].textsPerDay; }
export function textsLeft(s: AppState): number { return Math.max(0, textsLimit(s) - s.credits.textsUsed); }
export function callSecondsLeft(s: AppState): number {
  const daily = s.plan === "free" ? FREE_CALL_SECONDS_PER_DAY : 0;
  const monthly = PLANS[s.plan].callSecondsPerMonth;
  return Math.max(0, daily - s.credits.callSecondsToday + s.credits.bonusCallSeconds + Math.max(0, monthly - s.credits.planCallSecondsUsed) + s.credits.packCallSeconds);
}
export function callRingCapacity(s: AppState): number {
  const daily = s.plan === "free" ? FREE_CALL_SECONDS_PER_DAY : 0;
  return daily + WELCOME_BONUS_SECONDS + PLANS[s.plan].callSecondsPerMonth + s.credits.packCallSeconds;
}
export function spendText(s: AppState): AppState {
  const ready = refillIfNewDay(s);
  return { ...ready, credits: { ...ready.credits, textsUsed: clamp(ready.credits.textsUsed + 1, 0, textsLimit(ready)) } };
}
export function spendCallSeconds(s: AppState, sec: number): AppState {
  const ready = refillIfNewDay(s);
  let remaining = Math.max(0, Math.floor(sec));
  const dailyLimit = ready.plan === "free" ? FREE_CALL_SECONDS_PER_DAY : 0;
  const dailyLeft = Math.max(0, dailyLimit - ready.credits.callSecondsToday);
  const dailySpend = Math.min(remaining, dailyLeft); remaining -= dailySpend;
  const bonusSpend = Math.min(remaining, ready.credits.bonusCallSeconds); remaining -= bonusSpend;
  const monthlyLeft = Math.max(0, PLANS[ready.plan].callSecondsPerMonth - ready.credits.planCallSecondsUsed);
  const monthlySpend = Math.min(remaining, monthlyLeft); remaining -= monthlySpend;
  const packSpend = Math.min(remaining, ready.credits.packCallSeconds);
  return { ...ready, credits: { ...ready.credits, callSecondsToday: ready.credits.callSecondsToday + dailySpend, bonusCallSeconds: ready.credits.bonusCallSeconds - bonusSpend, planCallSecondsUsed: ready.credits.planCallSecondsUsed + monthlySpend, packCallSeconds: ready.credits.packCallSeconds - packSpend } };
}
