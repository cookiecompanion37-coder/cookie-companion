"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Pause, Play, Sparkles } from "lucide-react";
import type { Character, Msg, Reaction } from "@/lib/types";
import { CRISIS_RESOURCES } from "@/lib/constants";
import { Waveform } from "@/components/chat/Waveform";
import { cn } from "@/lib/utils";

const RATIO: Record<string, string> = { "4:5": "4 / 5", "3:4": "3 / 4", "1:1": "1 / 1", "9:16": "9 / 16" };

function ImageBubble({ msg }: { msg: Msg }): React.JSX.Element | null {
  const image = msg.image;
  if (!image) return null;
  return (
    <div className="relative w-[236px] max-w-[70vw] overflow-hidden rounded-[22px] border border-white/60 bg-[linear-gradient(150deg,#ffe0ea,#ffeede_55%,#efe3ff)] shadow-[0_16px_32px_-22px_rgba(120,20,60,.6)]">
      <div style={{ aspectRatio: RATIO[image.ar] ?? "4 / 5" }} className="relative w-full">
        {image.status === "ready" && image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.prompt || "a photo"} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : image.status === "failed" ? (
          <div className="absolute inset-0 grid place-items-center px-5 text-center">
            <span className="text-[12px] font-semibold text-[#8a4258]">the photo didn’t develop 😔</span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="shimmer absolute inset-0 opacity-70" />
            <div className="relative flex flex-col items-center gap-2 text-[#8a4258]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/60"><Sparkles size={18} className="animate-pulse" /></span>
              <span className="text-[11px] font-bold tracking-wide">developing your photo…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Bubble({
  msg,
  character,
  tail,
  onReact,
  onLongPress,
}: {
  msg: Msg;
  character: Pick<Character, "accent" | "emoji" | "name">;
  tail: boolean;
  onReact(msgId: string, e: Reaction | null): void;
  onLongPress(msg: Msg, rect: DOMRect): void;
}): React.JSX.Element {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const tapAt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const mine = msg.role === "user";
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const startPress = (event: PointerEvent<HTMLDivElement>) => {
    longPressed.current = false;
    const target = event.currentTarget;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { longPressed.current = true; onLongPress(msg, target.getBoundingClientRect()); }, 460);
  };
  const endPress = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };
  const doubleTap = (event: MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (!longPressed.current && now - tapAt.current < 300) onReact(msg.id, "❤️");
    tapAt.current = now;
    if (mine) event.stopPropagation();
  };
  const togglePlayback = () => {
    if (playing) { setPlaying(false); setProgress(0); return; }
    setPlaying(true);
    setProgress(0.08);
    const started = Date.now();
    const update = () => {
      const value = Math.min(1, (Date.now() - started) / Math.max(1200, (msg.durationSec ?? 5) * 1000));
      setProgress(value);
      if (value < 1) timer.current = window.setTimeout(update, 100);
      else { setPlaying(false); timer.current = null; }
    };
    timer.current = window.setTimeout(update, 100);
  };

  const hasImage = Boolean(msg.image);
  const bubblePad = hasImage ? "p-1.5" : "px-4 py-2.5";
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 360, damping: 28 }} className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div className={cn("relative max-w-[82%]", hasImage && "max-w-[76%]", mine && "items-end")}>
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(event) => { event.preventDefault(); onLongPress(msg, event.currentTarget.getBoundingClientRect()); }}
          onClick={doubleTap}
          className={cn(
            "selectable relative overflow-hidden",
            hasImage ? "rounded-[24px]" : "rounded-[20px]",
            mine ? (hasImage ? "" : "bubble-me rounded-br-[7px]") : "bubble-ai",
            hasImage ? "bg-white/70 p-1.5 backdrop-blur-md" : bubblePad,
            tail && (mine ? "rounded-br-[7px]" : "rounded-bl-[7px]"),
          )}
        >
          {msg.kind === "crisis" ? (
            <div className={cn("min-w-[240px] px-2 py-1", mine ? "text-ink" : "")}>
              <p className="font-display font-semibold">I’m glad you told me.</p>
              <p className="mt-1 text-[13px] leading-relaxed">You deserve real support from someone who can be there with you.</p>
              <div className="mt-3 space-y-2">
                {CRISIS_RESOURCES.map((resource) => (
                  <div key={resource.label} className="rounded-xl bg-white/60 p-2 text-[11px]">
                    <strong>{resource.label}</strong>
                    <p className="mt-0.5 opacity-80">{resource.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {hasImage && <ImageBubble msg={msg} />}
              {msg.kind === "voice" ? (
                <div className={cn("flex min-w-[205px] items-center gap-2.5", hasImage ? "px-2 py-2" : "")}>
                  <button type="button" aria-label={playing ? "Pause voice note" : "Play voice note"} onClick={togglePlayback} className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", mine ? "bg-white/25 text-white" : "bg-white/80 text-[#c60f4d]")}>
                    {playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                  </button>
                  <Waveform progress={progress} live={playing} seed={msg.id.length} tint={mine ? "light" : "candy"} />
                  <span className="text-[11px] font-bold tabular-nums opacity-80">{Math.floor((msg.durationSec ?? 0) / 60)}:{String((msg.durationSec ?? 0) % 60).padStart(2, "0")}</span>
                </div>
              ) : msg.text ? (
                <p className={cn("whitespace-pre-wrap break-words text-[15px] leading-[1.45]", hasImage && "px-2.5 pb-1.5 pt-2", mine && hasImage && "text-ink")}>{msg.text}</p>
              ) : null}
            </>
          )}
        </div>
        {msg.reactions.length > 0 && (
          <div className={cn("absolute -bottom-3.5 flex items-center gap-0.5 rounded-full border border-white/80 bg-white px-1.5 py-0.5 text-[13px] shadow-[0_4px_10px_-4px_rgba(100,20,50,.35)]", mine ? "right-2" : "left-2")}>
            {msg.reactions.map((reaction) => (
              <span key={`${reaction.by}-${reaction.emoji}`} className="flex items-center gap-0.5">
                {reaction.by === "ai" && <span className="text-[9px]" aria-hidden="true">{character.emoji}</span>}
                {reaction.emoji}
                {reaction.by === "user" && (
                  <button type="button" aria-label="Remove reaction" onClick={() => onReact(msg.id, null)} className="grid h-5 w-5 place-items-center text-[11px] text-[#a16376]">×</button>
                )}
              </span>
            ))}
          </div>
        )}
        {mine && !hasImage && (
          <div aria-label={msg.status ?? "sent"} className="mt-0.5 flex justify-end pr-1 text-[9px] text-[color:var(--ink-soft)]">
            {msg.status === "seen" ? <CheckCheck size={12} className="text-[#f5286e]" /> : msg.status === "delivered" ? <CheckCheck size={12} /> : <Check size={12} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}
