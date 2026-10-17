"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Heart, X } from "lucide-react";
import { formatRemaining, isLiked, likeStory, remainingMs, type Story } from "@/lib/storyFeed";

/**
 * Full-bleed 9:16 viewer.
 *
 * Grouped per author by the host, so the progress strip stays readable. Auto
 * advance pauses while the finger is down, likes are optimistic, and the
 * countdown is real — these posts are gone in 24 h.
 */
export function StoryViewer({
  stories, start, onClose,
}: {
  stories: Story[];
  start: number;
  onClose(): void;
}) {
  const active = stories[Math.max(0, Math.min(start, stories.length - 1))];
  const [index, setIndex] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [likes, setLikes] = useState(() => Object.fromEntries(stories.map((story) => [story.id, { liked: isLiked(story.id), count: story.likeCount }])));
  const closing = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  }, [onClose]);

  const step = useCallback((direction: 1 | -1) => {
    // Never call setState on another component from inside an updater: React
    // treats that as a render-phase update. Read the index from a ref instead.
    const next = indexRef.current + direction;
    if (next < 0) return;
    if (next >= stories.length) { close(); return; }
    setIndex(next);
  }, [stories.length, close]);

  const story = stories[index] ?? active;

  useEffect(() => { setProgress(0); }, [index]);

  useEffect(() => {
    if (!story) { close(); return; }
    if (remainingMs(story) <= 0) { step(1); return; }
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(1, (Date.now() - startedAt) / 6_000);
      setProgress(pct);
      if (pct >= 1) step(1);
    }, 50);
    return () => window.clearInterval(timer);
  }, [index, paused, step, story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);

  if (!story) return null;
  const like = likes[story.id] ?? { liked: false, count: story.likeCount };

  const toggleLike = () => {
    setLikes((current) => {
      const entry = current[story.id] ?? { liked: false, count: story.likeCount };
      return { ...current, [story.id]: { liked: !entry.liked, count: Math.max(0, entry.count + (entry.liked ? -1 : 1)) } };
    });
    void likeStory(story);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${story.authorName} story`}
    >
      {/* Blurred ambience so portrait media never sits on a flat black gap. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.mediaUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,255,255,.08),transparent_60%)]" />

      <div className="relative mx-auto flex h-full w-full max-w-[460px] flex-col">
        <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[max(10px,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {stories.map((entry, position) => (
              <span key={entry.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25">
                <span
                  className="block h-full rounded-full bg-white"
                  style={{ width: `${position < index ? 100 : position === index ? progress * 100 : 0}%` }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/80 text-[13px] font-bold"
              style={{ background: story.authorAccent }}
            >
              {story.authorName.trim().slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold leading-tight">{story.authorName}</p>
              <p className="text-[10.5px] font-medium text-white/60">{story.isAi ? "AI companion" : "Shared moment"}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
              <Clock size={11} /> {formatRemaining(remainingMs(story))}
            </span>
            <button type="button" onClick={close} aria-label="Close story" className="press grid h-9 w-9 place-items-center rounded-full bg-black/35 backdrop-blur-sm">
              <X size={17} />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 select-none"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.mediaUrl}
            alt={story.caption || `${story.authorName}'s story`}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <button type="button" aria-label="Previous story" onClick={() => step(-1)} className="absolute inset-y-0 left-0 w-[30%]" />
          <button type="button" aria-label="Next story" onClick={() => step(1)} className="absolute inset-y-0 right-0 w-[30%]" />
        </div>

        <div className="relative z-20 shrink-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.72))] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-12">
          {story.caption && <p className="max-w-[92%] text-[15px] font-medium leading-snug drop-shadow">{story.caption}</p>}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">disappears in 24 hours</span>
            <button
              type="button"
              onClick={toggleLike}
              aria-label={like.liked ? "Remove like" : "Like story"}
              className="press inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-[13px] font-bold backdrop-blur-md"
            >
              <Heart size={17} className={like.liked ? "fill-[#ff4d88] text-[#ff4d88]" : "text-white"} strokeWidth={2.2} />
              <span>{like.count}</span>
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-1 top-1/2 hidden -translate-y-1/2 items-center text-white/40 sm:flex">
          <ChevronLeft size={22} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-1 top-1/2 hidden -translate-y-1/2 items-center text-white/40 sm:flex">
          <ChevronRight size={22} />
        </div>
      </div>

      <AnimatePresence>{paused && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold backdrop-blur">
          paused
        </motion.span>
      )}</AnimatePresence>
    </motion.div>
  );
}
