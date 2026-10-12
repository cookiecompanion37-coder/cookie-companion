"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ArrowUp, Mic, X } from "lucide-react";
import { Chip } from "@/components/ui/Button";
import { Waveform } from "@/components/chat/Waveform";
import { formatTime } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { sfx } from "@/lib/sfx";
import { fx } from "@/components/effects/Particles";

export function Composer({ disabled, outOfCredits, quickReplies, onSend, onVoiceNote, onUpgrade }: { disabled: boolean; outOfCredits: boolean; quickReplies: string[]; onSend(text: string): void; onVoiceNote(durationSec: number): void; onUpgrade(): void }): React.JSX.Element {
  const [text, setText] = useState(""); const [recording, setRecording] = useState(false); const [elapsed, setElapsed] = useState(0); const [cancelRecord, setCancelRecord] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null); const start = useRef(0); const originX = useRef(0);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 200);
    return () => window.clearInterval(timer);
  }, [recording]);
  const send = (value = text) => {
    const trimmed = value.trim(); if (!trimmed || disabled) return;
    onSend(trimmed); setText("");
    if (area.current) { area.current.style.height = "auto"; area.current.focus(); }
    sfx.send(); haptic("send");
    const rect = area.current?.getBoundingClientRect(); const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
    if (rect) fx.poof(rect.right - (shell?.left ?? 0) - 22, rect.top - (shell?.top ?? 0) + 14);
  };
  const startRecording = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || text.trim()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = Date.now(); originX.current = event.clientX; setElapsed(0); setCancelRecord(false); setRecording(true); haptic("send");
  };
  const moveRecording = (event: PointerEvent<HTMLButtonElement>) => { if (recording) setCancelRecord(event.clientX < originX.current - 70); };
  const stopRecording = () => {
    if (!recording) return;
    const seconds = Math.max(1, Math.round((Date.now() - start.current) / 1000));
    const shouldCancel = cancelRecord; setRecording(false); setCancelRecord(false);
    if (!shouldCancel && seconds >= 1) { onVoiceNote(seconds); sfx.send(); }
  };
  return <div className="relative z-10 shrink-0 border-t border-white/60 bg-cream/80 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
    {outOfCredits && <div className="mb-2 flex items-center justify-between rounded-2xl bg-blush px-3 py-2 text-xs font-bold text-choc"><span>Out of chats for today, refills at midnight</span><button type="button" onClick={onUpgrade} className="min-h-11 rounded-full bg-white/80 px-3 text-choc">Upgrade</button></div>}
    {quickReplies.length > 0 && !recording && <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">{quickReplies.slice(0, 3).map((reply) => <Chip key={reply} size="sm" onClick={() => send(reply)}>{reply}</Chip>)}</div>}
    <div className="flex items-end gap-2">
      <div className="clay flex min-h-[50px] flex-1 items-end rounded-[22px] px-3 py-2">
        {recording ? <div className="flex min-h-8 flex-1 items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-danger"/><Waveform live bars={22} seed={elapsed + 2}/><span className="min-w-10 text-xs font-bold tabular-nums">{formatTime(elapsed)}</span><span className={`text-[10px] ${cancelRecord ? "text-danger" : "text-choc-soft"}`}>{cancelRecord ? "release to cancel" : "slide left to cancel"}</span></div> : <textarea ref={area} disabled={disabled} rows={1} value={text} onChange={(event) => { setText(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={disabled ? "A little break until your chats refill" : "Message your companion…"} className="no-scrollbar max-h-[120px] min-h-11 flex-1 resize-none bg-transparent px-1 py-1 text-base leading-6 text-choc outline-none placeholder:text-choc-soft/55" />}
        <button type="button" aria-label={recording ? "Cancel voice note" : text.trim() ? "Send message" : "Hold to record a voice note"} disabled={disabled} onPointerDown={startRecording} onPointerMove={moveRecording} onPointerUp={stopRecording} onPointerCancel={stopRecording} onClick={() => { if (text.trim()) send(); }} className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${recording ? "bg-blush text-danger" : text.trim() ? "bg-biscuit text-white shadow" : "bg-cream-2 text-choc-soft"}`}>{recording ? <X size={18}/> : text.trim() ? <ArrowUp size={20} strokeWidth={3}/> : <Mic size={18}/>}</button>
      </div>

    </div>
  </div>;
}
