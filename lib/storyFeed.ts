"use client";

import { useEffect, useSyncExternalStore } from "react";
import { deviceId } from "@/lib/device";

/**
 * Story feed store.
 *
 * One shared fetch feeds the Home rail, the Stories page and the viewer. Likes
 * update optimistically and survive reloads via a small local set, then get
 * reconciled with the authoritative count when Supabase is configured.
 */

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorEmoji: string;
  authorAccent: string;
  mediaUrl: string;
  caption: string;
  scene: string;
  isAi: boolean;
  likeCount: number;
  createdAt: number;
  expiresAt: number;
  mine?: boolean;
}

const EMPTY: Story[] = [];
const LIKES_KEY = "cookie:story-likes";
const LIVE_MS = 24 * 60 * 60 * 1_000;

let stories: Story[] = EMPTY;
let liked: Set<string> = new Set();
let likedLoaded = false;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }

function loadLikes(): Set<string> {
  if (likedLoaded || typeof window === "undefined") return liked;
  likedLoaded = true;
  try {
    const raw = window.localStorage.getItem(LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    if (Array.isArray(parsed)) liked = new Set(parsed.filter((entry): entry is string => typeof entry === "string"));
  } catch { liked = new Set(); }
  return liked;
}

function saveLikes(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(LIKES_KEY, JSON.stringify([...liked])); } catch { /* storage may be full */ }
}

function prune(list: Story[]): Story[] {
  const now = Date.now();
  return list.filter((story) => story.expiresAt > now);
}

function replace(next: Story[]): void {
  const sorted = prune(next).sort((a, b) => b.createdAt - a.createdAt);
  if (sorted.length === stories.length && sorted.every((story, index) => story.id === stories[index]?.id && story.likeCount === stories[index]?.likeCount)) return;
  stories = sorted;
  emit();
}

export async function refreshStories(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch("/api/stories?limit=40", {
        headers: { "x-viewer": deviceId() },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json() as { stories?: Story[] };
      if (Array.isArray(data.stories)) {
        const likes = loadLikes();
        replace(data.stories.map((story) => (
          likes.has(story.id) ? { ...story, likeCount: Math.max(story.likeCount, 1) } : story
        )));
        loaded = true;
      }
    } catch { /* offline is fine — the rail shows cached entries */ }
    finally { inflight = null; }
  })();
  return inflight;
}

export function useStoryFeed(): { stories: Story[]; loaded: boolean; refresh: () => Promise<void> } {
  const snapshot = useSyncExternalStore(subscribe, () => stories, () => EMPTY);
  useEffect(() => {
    if (!loaded) void refreshStories();
    const timer = window.setInterval(() => { void refreshStories(); }, 90_000);
    return () => window.clearInterval(timer);
  }, []);
  // Expiry must also happen while the page sits open.
  useEffect(() => {
    const timer = window.setInterval(() => { if (stories.length) replace(stories); }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return { stories: snapshot, loaded, refresh: refreshStories };
}

export function isLiked(storyId: string): boolean {
  return loadLikes().has(storyId);
}

/** Optimistic like, then reconcile with the server. */
export async function likeStory(story: Story): Promise<void> {
  const likes = loadLikes();
  const wasLiked = likes.has(story.id);
  const delta = wasLiked ? -1 : 1;
  if (wasLiked) likes.delete(story.id); else likes.add(story.id);
  saveLikes();
  replace(stories.map((entry) => entry.id === story.id ? { ...entry, likeCount: Math.max(0, entry.likeCount + delta) } : entry));

  try {
    const response = await fetch("/api/stories/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: story.id, viewer: deviceId() }),
    });
    const data = await response.json() as { liked?: boolean; likeCount?: number; local?: boolean };
    if (!response.ok || data.local || typeof data.likeCount !== "number") return;
    if (data.liked) likes.add(story.id); else likes.delete(story.id);
    saveLikes();
    replace(stories.map((entry) => entry.id === story.id ? { ...entry, likeCount: data.likeCount ?? entry.likeCount } : entry));
  } catch { /* optimistic state stands */ }
}

export function addLocalStory(story: Story): void {
  loaded = true;
  replace([{ ...story, mine: true }, ...stories]);
}

export function remainingMs(story: Story): number {
  return Math.max(0, story.expiresAt - Date.now());
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m left` : `${hours}h left`;
}

export const STORY_LIFETIME_MS = LIVE_MS;
