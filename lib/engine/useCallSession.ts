"use client";

import { useCallback, useEffect, useState } from "react";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useMicLevel, supportsRecognition, createRecognizer } from "@/lib/voice";

export function useCallSession(): { level: number; transcript: string; draft: string; setDraft(value: string): void; submit(value: string): void; captions: boolean; canUseVoice: boolean } {
  const { call, callTurn } = useEngine();
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState("");
  const [canUseVoice, setCanUseVoice] = useState(false);
  const level = useMicLevel(Boolean(call && call.phase === "listening" && !call.muted));
  const submit = useCallback((value: string) => { const text = value.trim(); if (text) { callTurn(text); setDraft(""); setTranscript(""); } }, [callTurn]);
  useEffect(() => {
    if (!call || call.phase !== "listening" || call.muted) { setCanUseVoice(false); return; }
    if (!supportsRecognition()) { setCanUseVoice(false); return; }
    let silenceTimer: number | null = null;
    let current = "";
    const recognizer = createRecognizer({
      onResult: (text, isFinal) => {
        current = text.trim(); setTranscript(current);
        if (silenceTimer !== null) window.clearTimeout(silenceTimer);
        if (current) silenceTimer = window.setTimeout(() => { submit(current); }, isFinal ? 250 : 800);
      },
      onEnd: () => { if (silenceTimer !== null) window.clearTimeout(silenceTimer); },
    });
    if (!recognizer) { setCanUseVoice(false); return; }
    setCanUseVoice(true);
    try { recognizer.start(); } catch { setCanUseVoice(false); }
    return () => { if (silenceTimer !== null) window.clearTimeout(silenceTimer); recognizer.stop(); };
  }, [call?.characterId, call?.phase, call?.muted, submit]);
  return { level, transcript, draft, setDraft, submit, captions: true, canUseVoice };
}
