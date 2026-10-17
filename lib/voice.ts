"use client";

import { useEffect, useRef, useState } from "react";
import type { Character, Gender } from "@/lib/types";

interface RecognitionAlternative { readonly transcript: string; }
interface RecognitionResult { readonly 0: RecognitionAlternative; readonly isFinal: boolean; }
interface RecognitionEvent { readonly resultIndex: number; readonly results: ArrayLike<RecognitionResult>; }
interface Recognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
}
interface RecognitionWindow extends Window { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition; }

export function voiceParams(description: string, gender: Gender): { pitch: number; rate: number } {
  const text = description.toLowerCase();
  const pitch = text.includes("low") || text.includes("husky") ? .82 : text.includes("bright") || gender === "female" ? 1.12 : gender === "male" ? .94 : 1;
  const rate = text.includes("slow") || text.includes("measured") || text.includes("calm") ? .9 : text.includes("quick") || text.includes("energetic") ? 1.08 : 1;
  return { pitch, rate };
}
let currentAudio: HTMLAudioElement | null = null;
function browserSpeak(text: string, character: Pick<Character, "gender" | "voice">, handlers: { onBoundary?: () => void; onEnd?: () => void }): void {
  if (!("speechSynthesis" in window)) { handlers.onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const params = voiceParams(character.voice, character.gender);
  utterance.pitch = params.pitch; utterance.rate = params.rate;
  utterance.onboundary = () => handlers.onBoundary?.();
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onEnd?.();
  window.speechSynthesis.speak(utterance);
}
export function speak(text: string, character: Pick<Character, "gender" | "voice">, handlers: { onBoundary?: () => void; onEnd?: () => void }): void {
  if (typeof window === "undefined") { handlers.onEnd?.(); return; }
  stopSpeaking();
  // Try GPU TTS; fall back to browser synthesis on any error
  void fetch("/api/gpu/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice_description: character.voice, text }),
    signal: AbortSignal.timeout(22_000),
  }).then(async (r) => {
    if (!r.ok) throw new Error("tts_fail");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; handlers.onEnd?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; browserSpeak(text, character, handlers); };
    void audio.play();
  }).catch(() => browserSpeak(text, character, handlers));
}
export function stopSpeaking(): void {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
export function supportsRecognition(): boolean {
  if (typeof window === "undefined") return false;
  const browser = window as RecognitionWindow;
  return Boolean(browser.SpeechRecognition ?? browser.webkitSpeechRecognition);
}
export function createRecognizer(handlers: { onResult(text: string, isFinal: boolean): void; onEnd(): void }): { start(): void; stop(): void } | null {
  if (typeof window === "undefined") return null;
  const browser = window as RecognitionWindow; const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) return null;
  try {
    const recognizer = new Constructor(); recognizer.lang = navigator.language || "en-US"; recognizer.continuous = true; recognizer.interimResults = true;
    recognizer.onresult = (event) => { const result = event.results[event.resultIndex]; if (result) handlers.onResult(result[0].transcript, result.isFinal); };
    recognizer.onend = handlers.onEnd;
    return { start: () => recognizer.start(), stop: () => recognizer.stop() };
  } catch { return null; }
}
export function useMicLevel(active: boolean): number {
  const [level, setLevel] = useState(0); const lastLevel = useRef(0);
  useEffect(() => {
    if (!active) { setLevel(0); return; }
    let frame = 0; let stream: MediaStream | null = null; let audio: AudioContext | null = null; let cancelled = false; let started = 0;
    const fallback = () => {
      started = performance.now();
      const tick = () => { if (cancelled) return; const wave = .13 + Math.abs(Math.sin((performance.now() - started) / 260)) * .18; lastLevel.current += (wave - lastLevel.current) * .12; setLevel(lastLevel.current); frame = requestAnimationFrame(tick); };
      tick();
    };
    const connect = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        audio = new AudioContext(); const source = audio.createMediaStreamSource(stream); const analyser = audio.createAnalyser(); analyser.fftSize = 256; source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(data);
          const rms = Math.sqrt(data.reduce((sum, value) => sum + (value - 128) ** 2, 0) / data.length) / 128;
          lastLevel.current += (Math.min(1, rms * 3) - lastLevel.current) * .2; setLevel(lastLevel.current); frame = requestAnimationFrame(tick);
        };
        tick();
      } catch { fallback(); }
    };
    void connect();
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); if (audio) void audio.close(); };
  }, [active]);
  return Math.min(1, Math.max(0, level));
}
