/**
 * Story timing planner.
 *
 * The point is to look human, not like a metronome. Instead of "one every 500 s"
 * we sketch a day the way people actually post: quiet at 3am, a burst around
 * breakfast, a lull mid-afternoon, busy in the evening. Each day gets a fresh
 * set of times, seeded randomly, then the dispatcher simply obeys the list.
 *
 * Pure functions only — no DB, no network — so the shape is easy to reason
 * about and cheap to test.
 */

export interface PlannedSlot {
  /** 1-based position in the day, unique per day. */
  seq: number;
  /** Epoch milliseconds (UTC). */
  dueAt: number;
}

/** Relative posting appetite per hour of the *audience* day (IST). */
const HOUR_WEIGHT_IST = [
  0.15, 0.08, 0.05, 0.04, 0.05, 0.12, // 00–05
  0.35, 0.7, 1.15, 1.5, 1.3, 1.0,     // 06–11
  0.8, 0.95, 1.05, 1.0, 0.85, 0.8,    // 12–17
  1.0, 1.35, 1.6, 1.7, 1.4, 0.8,      // 18–23
];

const IST_OFFSET_MIN = 330; // UTC+05:30
const MIN_GAP_MS = 7 * 60_000; // GPU render is ~6–7 min; never overlap renders.

function weightFor(utcHour: number): number {
  const istHour = Math.floor(((utcHour * 60 + IST_OFFSET_MIN) % 1440) / 60);
  return HOUR_WEIGHT_IST[istHour] ?? 0.5;
}

function weightedHour(dayStartMs: number, random: () => number): number {
  // Rejection sampling keeps the distribution readable and avoids float tables.
  let max = 0;
  for (let hour = 0; hour < 24; hour += 1) max = Math.max(max, weightFor(hour));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const hour = Math.floor(random() * 24);
    if (random() * max <= weightFor(hour)) return dayStartMs + hour * 3_600_000;
  }
  const fallback = Math.floor(random() * 24);
  return dayStartMs + fallback * 3_600_000;
}

export interface PlanOptions {
  /** UTC midnight of the day being planned. */
  dayStart: number;
  /** Hard ceiling from the budget (env AI_STORIES_PER_DAY). */
  cap: number;
  /** Stories already posted today (so a mid-day deploy doesn't cram a day). */
  alreadyPosted: number;
  /** Untouched time is left alone; only plan forward from here. */
  now: number;
  /** ~80/day. Used to keep the remaining day proportionate. */
  dailyTarget: number;
  /** True only before the very first AI story exists — makes the feed non-empty fast. */
  kickstart?: boolean;
  random?: () => number;
}

/**
 * Build today's remaining schedule.
 *
 * - Never plans a time in the past.
 * - Never exceeds the remaining budget.
 * - Shrinks the count when most of the day is gone, so a 9pm deploy gets an
 *   evening's worth of posts instead of 60 posts in three hours.
 */
export function planRemainingDay(options: PlanOptions): PlannedSlot[] {
  const random = options.random ?? Math.random;
  const dayEnd = options.dayStart + 24 * 3_600_000;
  const remainingBudget = Math.max(0, options.cap - options.alreadyPosted);
  if (remainingBudget === 0 || options.now >= dayEnd) return [];

  const hoursLeft = (dayEnd - options.now) / 3_600_000;
  const expectedPerHour = options.dailyTarget / 24;
  // Allow a little front-loading but never more than the true budget.
  const target = Math.min(remainingBudget, Math.ceil(hoursLeft * expectedPerHour * 1.15));
  if (target <= 0) return [];

  const picks: number[] = [];
  for (let index = 0; index < target; index += 1) {
    picks.push(weightedHour(options.dayStart, random) + Math.floor(random() * 3_600_000));
  }
  picks.sort((a, b) => a - b);

  // Push collisions forward instead of dropping them, keeping the min gap.
  const slots: number[] = [];
  for (const pick of picks) {
    const previous = slots.at(-1);
    const next = previous !== undefined && pick < previous + MIN_GAP_MS ? previous + MIN_GAP_MS : pick;
    if (next >= dayEnd) break;
    if (next > options.now + 30_000) slots.push(next);
  }

  // A brand-new deployment (or a quiet 3am window) should not leave the feed
  // empty for hours. Seed one near-future post, respecting the GPU gap.
  if (slots.length === 0 && target > 0) {
    const soon = options.now + 3 * 60_000 + Math.floor(random() * 4 * 60_000);
    if (soon < dayEnd) slots.push(soon);
  } else if (slots[0] && slots[0] - options.now > 20 * 60_000 && slots.length < remainingBudget) {
    const candidate = Math.max(options.now + 2 * 60_000, slots[0] - 12 * 60_000);
    if (candidate + MIN_GAP_MS <= slots[0]) slots.unshift(candidate);
  } else if (options.kickstart && slots[0] && slots[0] - options.now > 8 * 60_000) {
    // First ever story: don't make the first visitor stare at an empty rail.
    const soon = options.now + 2 * 60_000 + Math.floor(random() * 4 * 60_000);
    if (soon + MIN_GAP_MS <= slots[0]) {
      slots.unshift(soon);
      if (slots.length > remainingBudget) slots.pop();
    }
  }

  return slots.map((dueAt, index) => ({ seq: index + 1, dueAt }));
}

/** UTC day key + midnight, shared by the planner and the budget. */
export function utcDay(at: number): { key: string; start: number } {
  const date = new Date(at);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return { key: new Date(start).toISOString().slice(0, 10), start };
}

/** Human-facing hint used by the admin panel. */
export function describeGap(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
