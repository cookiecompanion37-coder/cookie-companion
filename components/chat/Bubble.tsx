"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Play, Pause } from "lucide-react";
import type { Character, Msg, Reaction } from "@/lib/types";
import { CRISIS_RESOURCES } from "@/lib/constants";
import { Waveform } from "@/components/chat/Waveform";
import { cn } from "@/lib/utils";

export function Bubble({ msg, character, tail, onReact, onLongPress }: { msg: Msg; character: Pick<Character, "accent" | "emoji" | "name">; tail: boolean; onReact(msgId: string, e: Reaction | null): void; onLongPress(msg: Msg, rect: DOMRect): void }): React.JSX.Element {
  const timer = useRef<number | null>(null); const longPressed = useRef(false); const tapAt = useRef(0);
  const [playing, setPlaying] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  const startPress = (event: PointerEvent<HTMLDivElement>) => {
    longPressed.current = false;
    const target = event.currentTarget;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { longPressed.current = true; onLongPress(msg, target.getBoundingClientRect()); }, 500);
  };
  const endPress = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };
  const doubleTap = (event: MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (!longPressed.current && now - tapAt.current < 300) onReact(msg.id, "❤️");
    tapAt.current = now;
    if (msg.role === "user") event.stopPropagation();
  };
  const mine = msg.role === "user";
  const togglePlayback = () => {
    if (playing) { setPlaying(false); setProgress(0); return; }
    setPlaying(true); setProgress(.08);
    const started = Date.now();
    const update = () => {
      const value = Math.min(1, (Date.now() - started) / Math.max(1200, (msg.durationSec ?? 5) * 1000));
      setProgress(value);
      if (value < 1) timer.current = window.setTimeout(update, 100);
      else { setPlaying(false); timer.current = null; }
    };
    timer.current = window.setTimeout(update, 100);
  };
  return <motion.div initial={{ opacity: 0, y: 10, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
    <div className={cn("relative max-w-[82%]", mine && "items-end")}>
      <div onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); onLongPress(msg, event.currentTarget.getBoundingClientRect()); }} onClick={doubleTap} className={cn("selectable relative rounded-[22px] px-4 py-3 shadow-sm", mine ? "clay-gold rounded-br-[9px] text-white" : "rounded-bl-[9px] border border-white/75 bg-cream text-choc") } style={!mine ? { background: `linear-gradient(145deg,#fffdf8,${character.accent}19)` } : undefined}>
        {msg.kind === "crisis" ? <div className="min-w-[240px]"><p className="font-display font-bold">I’m glad you told me.</p><p className="mt-1 text-sm">You deserve real support from someone who can be there with you.</p><div className="mt-3 space-y-2">{CRISIS_RESOURCES.map((resource) => <div key={resource.label} className="rounded-xl bg-white/55 p-2 text-xs"><strong>{resource.label}</strong><p className="mt-0.5 opacity-80">{resource.detail}</p></div>)}</div></div> : msg.kind === "voice" ? <div className="flex min-w-[215px] items-center gap-2"><button type="button" aria-label={playing ? "Pause voice note" : "Play voice note"} onClick={togglePlayback} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/40">{playing ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}</button><Waveform progress={progress} live={playing} seed={msg.id.length}/><span className="text-xs font-bold">{Math.floor((msg.durationSec ?? 0) / 60)}:{String((msg.durationSec ?? 0) % 60).padStart(2,"0")}</span></div> : <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.text}</p>}
      </div>
      {msg.reactions.length > 0 && <div className={cn("absolute -bottom-4 flex items-center gap-1 rounded-full border border-white/80 bg-white px-2 py-1 text-xs shadow", mine ? "right-2" : "left-2")}>
        {msg.reactions.map((reaction) => <span key={`${reaction.by}-${reaction.emoji}`} className="flex items-center gap-0.5">{reaction.by === "ai" && <span className="text-[10px]">{character.emoji}</span>}{reaction.emoji}{reaction.by === "user" && <button type="button" aria-label="Remove reaction" onClick={() => onReact(msg.id, null)} className="flex min-h-11 min-w-11 items-center justify-center text-sm">×</button>}</span>)}
      </div>}
      {mine && <div aria-label={msg.status ?? "sent"} className="mt-1 flex justify-end pr-1 text-[10px] text-choc-soft/65">{msg.status === "seen" ? <CheckCheck size={13} className="text-biscuit-deep"/> : msg.status === "delivered" ? <CheckCheck size={13}/> : <Check size={13}/>}</div>}
      {!tail && <span className="sr-only">Message group continues</span>}
    </div>
  </motion.div>;
}
