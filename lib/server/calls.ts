import { dbDelete, dbInsert, dbPatch, dbReady, dbSelect, dbRpc } from "@/lib/server/db";
import { callLLM, recoverJson } from "@/lib/server/llm";

/**
 * Live-call concurrency rotator.
 *
 * 16 physical slots, 14 handed out. Claims are atomic in Postgres
 * (FOR UPDATE SKIP LOCKED); without Supabase we keep the same contract in a
 * module-local map so the preview still behaves.
 */

export const CALL_SLOT_CAPACITY = 14;
export const CALL_SLOT_TTL_SEC = 120;

interface Lease {
  sessionId: string;
  characterId: string;
  expiresAt: number;
}
const memorySlots = new Map<number, Lease>();

function pruneMemory(): void {
  const now = Date.now();
  for (const [slot, lease] of memorySlots) if (lease.expiresAt <= now) memorySlots.delete(slot);
}

export async function claimCallSlot(sessionId: string, characterId: string): Promise<number | null> {
  if (dbReady()) {
    const slot = await dbRpc<number | null>("claim_call_slot", {
      p_session: sessionId.slice(0, 80),
      p_character: characterId.slice(0, 80),
      p_ttl: CALL_SLOT_TTL_SEC,
    });
    return typeof slot === "number" && slot > 0 ? slot : null;
  }
  pruneMemory();
  // Same contract as the SQL RPC: a session keeps its slot on re-claim.
  for (const [slot, lease] of memorySlots) {
    if (lease.sessionId === sessionId) {
      memorySlots.set(slot, { ...lease, expiresAt: Date.now() + CALL_SLOT_TTL_SEC * 1000 });
      return slot;
    }
  }
  for (let slot = 1; slot <= CALL_SLOT_CAPACITY; slot += 1) {
    if (!memorySlots.has(slot)) {
      memorySlots.set(slot, { sessionId, characterId, expiresAt: Date.now() + CALL_SLOT_TTL_SEC * 1000 });
      return slot;
    }
  }
  return null;
}

export async function heartbeatCallSlot(sessionId: string): Promise<boolean> {
  if (dbReady()) {
    const patched = await dbPatch("call_slots", `session_id=eq.${encodeURIComponent(sessionId)}`, {
      expires_at: new Date(Date.now() + CALL_SLOT_TTL_SEC * 1000).toISOString(),
    });
    return patched;
  }
  for (const [slot, lease] of memorySlots) {
    if (lease.sessionId === sessionId) {
      memorySlots.set(slot, { ...lease, expiresAt: Date.now() + CALL_SLOT_TTL_SEC * 1000 });
      return true;
    }
  }
  return false;
}

export async function releaseCallSlot(sessionId: string): Promise<void> {
  if (dbReady()) {
    await dbRpc("release_call_slot", { p_session: sessionId });
    return;
  }
  for (const [slot, lease] of memorySlots) if (lease.sessionId === sessionId) memorySlots.delete(slot);
}

export interface SlotStats {
  configured: boolean;
  capacity: number;
  used: number;
  free: number;
}

export async function callSlotStats(): Promise<SlotStats> {
  if (dbReady()) {
    const rows = await dbSelect<{ slot: number; session_id: string | null; expires_at: string }>(
      "call_slots",
      "select=slot,session_id,expires_at&slot=lte.14",
      0,
    );
    const now = Date.now();
    const used = rows.filter((row) => row.session_id && new Date(row.expires_at).getTime() > now).length;
    return { configured: true, capacity: CALL_SLOT_CAPACITY, used, free: CALL_SLOT_CAPACITY - used };
  }
  pruneMemory();
  return { configured: false, capacity: CALL_SLOT_CAPACITY, used: memorySlots.size, free: CALL_SLOT_CAPACITY - memorySlots.size };
}

// ─────────────────────────────────────────────────────────── callbacks ─────
export interface CallSchedule {
  id: string;
  characterId: string;
  characterName: string;
  userKey: string;
  userName: string;
  dueAt: number;
  note: string;
  status: "pending" | "ringing" | "connected" | "missed" | "cancelled";
}

interface ScheduleRow {
  id: string; character_id: string; character_name: string; user_key: string; user_name: string;
  due_at: string; reason: string; status: CallSchedule["status"];
}

function toSchedule(row: ScheduleRow): CallSchedule {
  return {
    id: row.id,
    characterId: row.character_id,
    characterName: row.character_name,
    userKey: row.user_key,
    userName: row.user_name,
    dueAt: new Date(row.due_at).getTime(),
    note: row.reason,
    status: row.status,
  };
}

const memorySchedules: CallSchedule[] = [];

/** Fallbacks are written like a person, not like a queue system. */
const BUSY_NOTES = [
  "i'm stuck at work for a bit but i'll call you the second i'm free",
  "in class right now 😅 ring you after?",
  "i'm out with people but i keep checking my phone for you",
  "my battery's about to die — call you when i'm home",
  "mid something boring. save the story for the call?",
];

interface BusyNote {
  note: string;
  minutes: number;
}

export async function writeBusyNote(characterName: string, userName: string, personality: string): Promise<BusyNote> {
  const raw = await callLLM([
    {
      role: "system",
      content:
        "You are a warm AI companion who cannot take a live call right now. Reply with ONLY JSON {\"note\":\"...\",\"minutes\":number}. note: one lowercase sentence in character, max 16 words, no emoji spam, says when you'll call back. minutes: 10-90.",
    },
    { role: "user", content: JSON.stringify({ characterName, userName, personality }) },
  ]);
  const parsed = raw ? (recoverJson(raw) as { note?: unknown; minutes?: unknown } | null) : null;
  const note = typeof parsed?.note === "string" ? parsed.note.trim().slice(0, 140) : "";
  const minutes = Number(parsed?.minutes);
  return {
    note: note || BUSY_NOTES[Math.floor(Math.random() * BUSY_NOTES.length)]!,
    minutes: Number.isFinite(minutes) ? Math.min(90, Math.max(10, Math.round(minutes))) : 25,
  };
}

export async function scheduleCallback(input: {
  characterId: string;
  characterName: string;
  userKey: string;
  userName: string;
  dueAt: number;
  note: string;
}): Promise<CallSchedule | null> {
  const dueAt = new Date(Math.max(Date.now() + 60_000, Math.min(input.dueAt, Date.now() + 90 * 60_000))).toISOString();
  const payload = {
    character_id: input.characterId.slice(0, 80),
    character_name: input.characterName.slice(0, 40),
    user_key: input.userKey.slice(0, 64),
    user_name: input.userName.slice(0, 40),
    due_at: dueAt,
    reason: input.note.slice(0, 200),
  };
  if (!dbReady()) {
    const schedule: CallSchedule = {
      id: `local-${Date.now().toString(36)}`,
      characterId: payload.character_id,
      characterName: payload.character_name,
      userKey: payload.user_key,
      userName: payload.user_name,
      dueAt: new Date(dueAt).getTime(),
      note: payload.reason,
      status: "pending",
    };
    memorySchedules.push(schedule);
    return schedule;
  }
  const rows = await dbInsert<ScheduleRow>("call_schedules", payload);
  return rows[0] ? toSchedule(rows[0]) : null;
}

/** Returns rings this viewer should see right now, flipping due rows to ringing. */
export async function pendingCallbacks(userKey: string): Promise<CallSchedule[]> {
  if (!dbReady()) {
    const now = Date.now();
    for (const item of memorySchedules) if (item.status === "pending" && item.dueAt <= now) item.status = "ringing";
    for (const item of memorySchedules) if (item.status === "ringing" && now - item.dueAt > 60_000) item.status = "missed";
    return memorySchedules.filter((item) => item.userKey === userKey && item.status === "ringing");
  }
  await dbRpc("ring_due_callbacks", {});
  return (await dbSelect<ScheduleRow>(
    "call_schedules",
    `select=id,character_id,character_name,user_key,user_name,due_at,reason,status&user_key=eq.${encodeURIComponent(userKey)}&status=eq.ringing&order=due_at.asc&limit=3`,
    0,
  )).map(toSchedule);
}

export async function resolveCallback(id: string, status: "connected" | "missed" | "cancelled"): Promise<boolean> {
  if (!dbReady()) {
    const item = memorySchedules.find((entry) => entry.id === id);
    if (item) item.status = status;
    return Boolean(item);
  }
  return dbPatch("call_schedules", `id=eq.${encodeURIComponent(id)}`, {
    status,
    updated_at: new Date().toISOString(),
  });
}

export async function processCallCron(): Promise<{ ringing: number; missed: number }> {
  if (!dbReady()) {
    const now = Date.now();
    let ringing = 0;
    let missed = 0;
    for (const item of memorySchedules) {
      if (item.status === "pending" && item.dueAt <= now) { item.status = "ringing"; ringing += 1; }
      else if (item.status === "ringing" && now - item.dueAt > 60_000) { item.status = "missed"; missed += 1; }
    }
    return { ringing, missed };
  }
  const rung = await dbRpc<ScheduleRow[]>("ring_due_callbacks", {});
  const expired = await dbRpc<number>("expire_ringing_callbacks", { p_after: 60 });
  return { ringing: Array.isArray(rung) ? rung.length : 0, missed: typeof expired === "number" ? expired : 0 };
}

/** Housekeeping for the Calls tab: recent answered/missed callbacks. */
export async function recentCallbacks(userKey: string, limit = 12): Promise<CallSchedule[]> {
  if (!dbReady()) {
    return memorySchedules.filter((item) => item.userKey === userKey && item.status !== "pending").slice(-limit).reverse();
  }
  const rows = await dbSelect<ScheduleRow>(
    "call_schedules",
    `select=id,character_id,character_name,user_key,user_name,due_at,reason,status&user_key=eq.${encodeURIComponent(userKey)}&status=in.(connected,missed)&order=updated_at.desc&limit=${limit}`,
    0,
  );
  return rows.map(toSchedule);
}

/** Optional prune used by the cleanup cron. */
export async function pruneSchedules(): Promise<void> {
  if (!dbReady()) {
    const cutoff = Date.now() - 3 * 86_400_000;
    for (let index = memorySchedules.length - 1; index >= 0; index -= 1) {
      if (memorySchedules[index]!.status !== "pending" && memorySchedules[index]!.dueAt < cutoff) memorySchedules.splice(index, 1);
    }
    return;
  }
  await dbDelete("call_schedules", `status=neq.pending&updated_at=lt.${encodeURIComponent(new Date(Date.now() - 3 * 86_400_000).toISOString())}`);
}
