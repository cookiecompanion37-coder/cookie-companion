"use client";

import { deviceId } from "@/lib/device";

/**
 * Browser side of the call rotator: lease, heartbeat, release, callback notes.
 * The server decides whether a slot exists; this module never assumes it.
 */

let held = false;

export async function claimCallSlot(characterId: string): Promise<boolean> {
  if (held) return true;
  try {
    const response = await fetch("/api/calls/slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim", sessionId: deviceId(), characterId }),
    });
    const data = await response.json() as { slot?: number | null };
    held = response.ok && typeof data.slot === "number";
    return held;
  } catch { return false; }
}

export async function heartbeatCallSlot(): Promise<void> {
  if (!held) return;
  try {
    await fetch("/api/calls/slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "heartbeat", sessionId: deviceId() }),
    });
  } catch { /* a missed heartbeat is covered by the 120 s lease */ }
}

export async function releaseCallSlot(): Promise<void> {
  if (!held) return;
  held = false;
  try {
    await fetch("/api/calls/slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release", sessionId: deviceId() }),
    });
  } catch { /* lease expires on its own */ }
}

export interface BusyNote { note: string; minutes: number }

export async function writeBusyNote(character: { name: string; personality?: string }, userName: string): Promise<BusyNote> {
  try {
    const response = await fetch("/api/calls/busy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterName: character.name, userName, personality: character.personality }),
    });
    if (!response.ok) throw new Error("busy_failed");
    const data = await response.json() as Partial<BusyNote>;
    const minutes = Number(data.minutes);
    return {
      note: typeof data.note === "string" && data.note ? data.note : "i'm a little tied up — i'll call you back soon",
      minutes: Number.isFinite(minutes) ? Math.min(8, Math.max(1, Math.round(minutes))) : 2 + Math.floor(Math.random() * 7),
    };
  } catch {
    return { note: "i'm a little tied up — i'll call you back soon", minutes: 2 + Math.floor(Math.random() * 7) };
  }
}

export async function scheduleCallback(input: {
  characterId: string; characterName: string; userName: string; note: string; minutes: number;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/calls/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...input, userKey: deviceId() }),
    });
    return response.ok;
  } catch { return false; }
}

export interface ScheduledCall {
  id: string;
  characterId: string;
  characterName: string;
  userKey: string;
  userName: string;
  dueAt: number;
  note: string;
  status: "pending" | "ringing" | "connected" | "missed" | "cancelled";
}

export async function fetchCallbacks(): Promise<{ ringing: ScheduledCall[]; recent: ScheduledCall[] }> {
  const empty = { ringing: [], recent: [] };
  try {
    const response = await fetch(`/api/calls/schedule?user=${encodeURIComponent(deviceId())}`, { cache: "no-store" });
    if (!response.ok) return empty;
    const data = await response.json() as Partial<{ ringing: ScheduledCall[]; recent: ScheduledCall[] }>;
    return {
      ringing: Array.isArray(data.ringing) ? data.ringing : [],
      recent: Array.isArray(data.recent) ? data.recent : [],
    };
  } catch { return empty; }
}

export async function resolveCallback(id: string, status: "connected" | "missed" | "cancelled"): Promise<void> {
  try {
    await fetch("/api/calls/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", id, status, userKey: deviceId() }),
    });
  } catch { /* the cron will mark it missed */ }
}
