"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";
import { ArrowUp, ImagePlus, Mic, X } from "lucide-react";
import { Chip } from "@/components/ui/Button";
import { Waveform } from "@/components/chat/Waveform";
import { formatTime } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { sfx } from "@/lib/sfx";
import { fx } from "@/components/effects/Particles";

export function Composer({
  disabled,
  outOfCredits,
  quickReplies,
  onSend,
  onVoiceNote,
  onPhoto,
  onUpgrade,
}: {
  disabled: boolean;
  outOfCredits: boolean;
  quickReplies: string[];
  onSend(text: string): void;
  onVoiceNote(blob: Blob | null, durationSec: number): void;
  onPhoto(file: File): void;
  onUpgrade(): void;
}): React.JSX.Element {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cancelRecord, setCancelRecord] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const start = useRef(0);
  const originX = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const send = (value = text) => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (area.current) { area.current.style.height = "auto"; area.current.focus(); }
    sfx.send();
    haptic("send");
    const rect = area.current?.getBoundingClientRect();
    const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
    if (rect) fx.poof(rect.right - (shell?.left ?? 0) - 24, rect.top - (shell?.top ?? 0) + 18);
  };

  const startRecording = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || text.trim()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = Date.now();
    originX.current = event.clientX;
    cancelled.current = false;
    setElapsed(0);
    setCancelRecord(false);
    setRecording(true);
    haptic("send");
    chunks.current = [];
    try {
      if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
        void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          if (cancelled.current) { stream.getTracks().forEach((track) => track.stop()); return; }
          const media = new MediaRecorder(stream);
          recorder.current = media;
          media.ondataavailable = (chunk) => { if (chunk.data.size > 0) chunks.current.push(chunk.data); };
          media.onstop = () => stream.getTracks().forEach((track) => track.stop());
          media.start();
        }).catch(() => { /* mic blocked — still log the voice note */ });
      }
    } catch { /* recorder unavailable */ }
  };

  const moveRecording = (event: PointerEvent<HTMLButtonElement>) => {
    if (!recording) return;
    const shouldCancel = event.clientX < originX.current - 70;
    setCancelRecord(shouldCancel);
    cancelled.current = shouldCancel;
  };

  const stopRecording = () => {
    if (!recording) return;
    const seconds = Math.max(1, Math.round((Date.now() - start.current) / 1000));
    const shouldCancel = cancelRecord || cancelled.current;
    setRecording(false);
    setCancelRecord(false);
    const media = recorder.current;
    recorder.current = null;
    if (shouldCancel) {
      try { media?.stop(); } catch { /* already stopped */ }
      chunks.current = [];
      return;
    }
    if (media && media.state !== "inactive") {
      media.onstop = () => {
        media.stream.getTracks().forEach((track) => track.stop());
        const blob = chunks.current.length ? new Blob(chunks.current, { type: media.mimeType || "audio/webm" }) : null;
        onVoiceNote(blob, seconds);
        sfx.send();
      };
      try { media.stop(); } catch { onVoiceNote(null, seconds); }
    } else {
      onVoiceNote(null, seconds);
      sfx.send();
    }
  };

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      haptic("tap");
      onPhoto(file);
    }
    event.target.value = "";
  };

  return (
    <div className="relative z-10 shrink-0 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
      {outOfCredits && (
        <div className="mb-2 flex items-center justify-between rounded-2xl bg-[#ffe1ea] px-3 py-2 text-[11px] font-bold text-[#8a2948]">
          <span>Out of chats for today, refills at midnight</span>
          <button type="button" onClick={onUpgrade} className="press min-h-8 rounded-full bg-white/80 px-3 text-[#c60f4d]">Upgrade</button>
        </div>
      )}
      {quickReplies.length > 0 && !recording && (
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {quickReplies.slice(0, 3).map((reply) => <Chip key={reply} size="sm" onClick={() => send(reply)}>{reply}</Chip>)}
        </div>
      )}
      <div className="glass flex items-end gap-1.5 rounded-[26px] p-1.5">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        <button
          type="button"
          aria-label="Send a photo"
          disabled={disabled || recording}
          onClick={() => fileInput.current?.click()}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--ink-soft)] disabled:opacity-40"
        >
          <ImagePlus size={19} />
        </button>
        <div className="flex min-h-[44px] flex-1 items-center rounded-2xl px-1">
          {recording ? (
            <div className="flex w-full items-center gap-2 px-1">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#f5286e]" />
              <Waveform live bars={16} seed={elapsed + 2} />
              <span className="min-w-9 text-[11px] font-bold tabular-nums text-[color:var(--ink)]">{formatTime(elapsed)}</span>
              <span className={`text-[9px] font-semibold ${cancelRecord ? "text-[#e5395c]" : "text-[color:var(--ink-soft)]"}`}>{cancelRecord ? "release to cancel" : "slide to cancel"}</span>
            </div>
          ) : (
            <textarea
              ref={area}
              disabled={disabled}
              rows={1}
              value={text}
              onChange={(event) => { setText(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 116)}px`; }}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }}
              placeholder={disabled ? "Chats refill at midnight" : "Message…"}
              className="no-scrollbar max-h-[116px] min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)]/60"
            />
          )}
        </div>
        <button
          type="button"
          aria-label={recording ? "Cancel voice note" : text.trim() ? "Send message" : "Hold to record a voice note"}
          disabled={disabled}
          onPointerDown={startRecording}
          onPointerMove={moveRecording}
          onPointerUp={stopRecording}
          onPointerCancel={stopRecording}
          onClick={() => { if (text.trim()) send(); }}
          className={`press grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all ${recording ? "bg-[#ffe1ea] text-[#e5395c]" : text.trim() ? "brand-gradient text-white shadow-[0_10px_22px_-10px_rgba(214,18,83,.9)]" : "bg-[color:var(--surface-2)] text-[color:var(--ink-soft)]"}`}
        >
          {recording ? <X size={18} /> : text.trim() ? <ArrowUp size={20} strokeWidth={2.8} /> : <Mic size={18} />}
        </button>
      </div>
      <p className="mt-1 text-center text-[9px] font-medium text-[color:var(--ink-soft)]/70">Cookie is an AI companion · fictional, always</p>
    </div>
  );
}
