"use client";

import { useSyncExternalStore } from "react";
import { refillIfNewDay } from "@/lib/credits";
import { DEFAULT_WALLPAPER } from "@/lib/theme";
import { DEFAULT_STATE } from "@/lib/seed";
import type { AppState, Character, Chat, Msg, Session } from "@/lib/types";

const STORAGE_KEY = "cookie:v1";
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
function loadOnce(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? refillIfNewDay(mergeStored(JSON.parse(raw) as unknown)) : refillIfNewDay(DEFAULT_STATE);
  } catch { state = refillIfNewDay(DEFAULT_STATE); }
  hydrated = true;
  hydrationListeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  loadOnce(); listeners.add(listener); listener();
  if (typeof window === "undefined") return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    try { state = event.newValue ? refillIfNewDay(mergeStored(JSON.parse(event.newValue) as unknown)) : DEFAULT_STATE; }
    catch { state = DEFAULT_STATE; }
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
function subscribeHydration(listener: () => void): () => void { loadOnce(); hydrationListeners.add(listener); listener(); return () => hydrationListeners.delete(listener); }
function scheduleWrite(): void {
  if (typeof window === "undefined") return;
  if (writeTimer !== null) window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be unavailable or full. */ }
    writeTimer = null;
  }, 150);
}
export function getState(): AppState { loadOnce(); return state; }
export function setState(fn: (s: AppState) => AppState): void { loadOnce(); state = fn(state); notify(); scheduleWrite(); }
export function useAppState(): AppState { return useSyncExternalStore(subscribe, getState, () => DEFAULT_STATE); }
export function useHydrated(): boolean { return useSyncExternalStore(subscribeHydration, () => hydrated, () => false); }
export function resetAll(): void {
  loaded = true; hydrated = true;
  setState(() => ({ ...DEFAULT_STATE, credits: { ...DEFAULT_STATE.credits }, settings: { ...DEFAULT_STATE.settings } }));
  if (typeof window !== "undefined") {
    if (writeTimer !== null) window.clearTimeout(writeTimer);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    writeTimer = null;
  }
  hydrationListeners.forEach((listener) => listener());
}
