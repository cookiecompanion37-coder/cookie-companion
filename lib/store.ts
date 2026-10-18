"use client";

import { useSyncExternalStore } from "react";
import { refillIfNewDay } from "@/lib/credits";
import { DEFAULT_WALLPAPER } from "@/lib/theme";
import { DEFAULT_STATE } from "@/lib/seed";
import type { AppState, Character, Chat, Msg, Session } from "@/lib/types";

let authenticated = false;
let accountRevision = 0;
let state: AppState = DEFAULT_STATE;
let loaded = false;
let hydrated = false;
let writeTimer: number | null = null;
const listeners = new Set<() => void>();
const hydrationListeners = new Set<() => void>();
function notify(): void { listeners.forEach((listener) => listener()); }

function normalizeCharacter(character: Character): Character {
  return {
    ...character,
    appearance: character.appearance ?? "",
    gallery: Array.isArray(character.gallery) ? character.gallery : [],
  };
}
function normalizeMessages(chat: Chat): Chat {
  return {
    ...chat,
    messages: Array.isArray(chat.messages) ? chat.messages.map((message) => ({ ...message, reactions: message.reactions ?? [] } as Msg)) : [],
  };
}
function mergeStored(value: unknown): AppState {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const stored = value as Partial<AppState> & { session?: Partial<Session> | null };
  const chats: Record<string, Chat> = {};
  for (const [id, chat] of Object.entries(stored.chats ?? {})) if (chat) chats[id] = normalizeMessages(chat);
  return {
    ...DEFAULT_STATE, ...stored,
    session: stored.session ? { name: stored.session.name ?? "friend", email: stored.session.email ?? "", vibe: stored.session.vibe ?? "Cozy", interests: stored.session.interests ?? [] } : null,
    credits: { ...DEFAULT_STATE.credits, ...(stored.credits ?? {}) },
    settings: { ...DEFAULT_STATE.settings, ...(stored.settings ?? {}) },
    wallpaper: stored.wallpaper ?? DEFAULT_WALLPAPER,
    characterWallpapers: stored.characterWallpapers ?? {},
    chats,
    customCharacters: (stored.customCharacters ?? []).map(normalizeCharacter),
    sharedCharacters: (stored.sharedCharacters ?? []).map(normalizeCharacter),
    memory: stored.memory ?? {},
    calls: stored.calls ?? [],
  };
}
export async function refreshAccount(): Promise<void> {
  const revision = ++accountRevision;
  try {
    const response = await fetch("/api/account/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load your account. Please try again.");
    const result = await response.json();
    if (revision !== accountRevision) return;
    authenticated = Boolean(result.user);
    if (result.user) {
      const restored = refillIfNewDay(mergeStored(result.data));
      state = { ...restored, stage: result.data?.stage === "main" ? "main" : "onboarding", session: { name: restored.session?.name || result.user.name, email: result.user.email ?? "", vibe: restored.session?.vibe ?? "Cozy", interests: restored.session?.interests ?? [] } };
    } else state = refillIfNewDay(DEFAULT_STATE);
  } finally {
    hydrated = true;
    notify();
    hydrationListeners.forEach(listener => listener());
  }
}
function loadOnce(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  void refreshAccount().catch(() => { window.dispatchEvent(new CustomEvent("cookie:save-error", { detail: "Account service unavailable. Please try again." })); });
}
function subscribe(listener: () => void): () => void {
  loadOnce(); listeners.add(listener); listener();
  return () => { listeners.delete(listener); };
}
function subscribeHydration(listener: () => void): () => void { loadOnce(); hydrationListeners.add(listener); listener(); return () => hydrationListeners.delete(listener); }
function scheduleWrite(): void {
  if (typeof window === "undefined" || !authenticated) return;
  if (writeTimer !== null) window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    void fetch("/api/account/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state), keepalive: true })
      .then(response => { if (!response.ok) throw new Error("Save failed"); })
      .catch(() => window.dispatchEvent(new CustomEvent("cookie:save-error", { detail: "Changes could not be saved. Check your connection." })));
    writeTimer = null;
  }, 700);
}
export function getState(): AppState { loadOnce(); return state; }
export function setState(fn: (s: AppState) => AppState): void { loadOnce(); state = fn(state); notify(); scheduleWrite(); }
export function useAppState(): AppState { return useSyncExternalStore(subscribe, getState, () => DEFAULT_STATE); }
export function useHydrated(): boolean { return useSyncExternalStore(subscribeHydration, () => hydrated, () => false); }
export async function resetAll(): Promise<void> {
  if (writeTimer !== null) window.clearTimeout(writeTimer);
  writeTimer = null;
  const response = await fetch("/api/account/state", { method: "DELETE" });
  if (!response.ok) throw new Error("Could not delete saved data. Try again.");
  authenticated = false;
  await refreshAccount();
}
export async function signOut(): Promise<void> {
  if (writeTimer !== null) {
    window.clearTimeout(writeTimer); writeTimer = null;
    const saved = await fetch("/api/account/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
    if (!saved.ok) throw new Error("Could not save your latest changes. Try again before signing out.");
  }
  const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout" }) });
  if (!response.ok) throw new Error("Could not sign out. Try again.");
  authenticated = false;
  await refreshAccount();
}
