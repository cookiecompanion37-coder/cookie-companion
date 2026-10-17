"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useMicLevel, supportsRecognition, createRecognizer } from "@/lib/voice";
import { setState } from "@/lib/store";
import { appendMessage, newMessage } from "@/lib/engine/engineUtils";

// ── PCM playback context (singleton per tab) ────────────────────────────────
let playCtx: AudioContext | null = null;
function getPlayCtx(): AudioContext {
  if (!playCtx || playCtx.state === "closed") {
    const Ctor = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)["webkitAudioContext"];
    playCtx = new Ctor();
  }
  return playCtx;
}
function playPcm(buf: ArrayBuffer, sampleRate: number): void {
  try {
    const ctx = getPlayCtx();
    const i16 = new Int16Array(buf);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    const ab = ctx.createBuffer(1, f32.length, sampleRate);
    ab.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = ab; src.connect(ctx.destination); src.start();
  } catch { /* ignore */ }
}

// ── Mic PCM streaming to GPU WebSocket ──────────────────────────────────────
function startMicStream(ws: WebSocket): () => void {
  let micCtx: AudioContext | null = null;
  let proc: ScriptProcessorNode | null = null;
  let stream: MediaStream | null = null;
  let cancelled = false;

  void navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } as MediaTrackConstraints,
  }).then((s) => {
    if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    const Ctor = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)["webkitAudioContext"];
    micCtx = new Ctor({ sampleRate: 16000 } as AudioContextOptions);
    const src = micCtx.createMediaStreamSource(s);
    proc = micCtx.createScriptProcessor(512, 1, 1);
    proc.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const f32 = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
      ws.send(i16.buffer);
    };
    src.connect(proc); proc.connect(micCtx.destination);
  }).catch(() => { /* mic denied — WS still open, just no audio */ });

  return () => {
    cancelled = true;
    try { proc?.disconnect(); } catch { /* ignore */ }
    if (micCtx) void micCtx.close();
    stream?.getTracks().forEach((t) => t.stop());
  };
}

export function useCallSession(): {
  level: number;
  transcript: string;
  draft: string;
  setDraft(value: string): void;
  submit(value: string): void;
  captions: boolean;
  canUseVoice: boolean;
  heard: string;
} {
  const { call, callTurn } = useEngine();
  const [transcript, setTranscript] = useState("");
  const [heard, setHeard] = useState("");
  const [draft, setDraft] = useState("");
  const [canUseVoice, setCanUseVoice] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const wsActive = useRef(false);

  // Mic level meter — drives avatar ring animation
  const level = useMicLevel(Boolean(call && call.phase === "listening" && !call.muted));

  const submit = useCallback((value: string) => {
    const text = value.trim(); if (!text) return;
    callTurn(text); setDraft(""); setTranscript(""); setHeard("");
  }, [callTurn]);

  // ── GPU WebSocket live-call ─────────────────────────────────────────────
  // Opens when call.wsUrl is set by answer() in useCallControls.
  // The GPU WS handles ALL call audio: mic in → AI voice out.
  // Zero LLM is NOT involved during live call.
  const wsUrl = call?.wsUrl;
  const characterId = call?.characterId;

  useEffect(() => {
    if (!wsUrl || !characterId) return;

    // Close any previous WS
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    wsActive.current = false;
    let stopMic: (() => void) | null = null;

    ws.onopen = () => {
      // Required handshake per API_GUIDE.md — hello first, then live
      ws.send(JSON.stringify({ type: "hello" }));
      ws.send(JSON.stringify({ type: "live" }));
      stopMic = startMicStream(ws);
      wsActive.current = true;
      setCanUseVoice(true);
      // Transition from "connecting" → "listening"
      window.dispatchEvent(new CustomEvent("cc:callPhase", { detail: { characterId, phase: "listening" } }));
    };

    ws.onmessage = (e) => {
      if (typeof e.data === "string") {
        try {
          const m = JSON.parse(e.data) as { type: string; v?: string; text?: string; msg?: string };

          if (m.type === "state") {
            // GPU states: listening | hearing | thinking | speaking
            const phaseMap: Record<string, string> = {
              listening: "listening", hearing: "listening",
              thinking: "thinking", speaking: "speaking",
            };
            const phase = phaseMap[m.v ?? ""] ?? "listening";
            window.dispatchEvent(new CustomEvent("cc:callPhase", { detail: { characterId, phase } }));
          }

          if (m.type === "user" && m.text) {
            setTranscript(m.text);
            setHeard(m.text);
            setState((s) => appendMessage(s, characterId, newMessage("user", m.text!), false, true));
          }

          if (m.type === "bot" && m.text) {
            setTranscript("");
            setHeard("");
            setState((s) => appendMessage(s, characterId, newMessage("assistant", m.text!)));
            window.dispatchEvent(new CustomEvent("cc:callAi", { detail: { characterId, text: m.text } }));
          }

          if (m.type === "error") console.warn("[GPU call WS]", m.msg);
        } catch { /* bad JSON — ignore */ }
      } else {
        // Binary: Int16 PCM @ 24000 Hz — play as AI voice output
        playPcm(e.data as ArrayBuffer, 24000);
      }
    };

    ws.onerror = () => {
      wsActive.current = false;
      setCanUseVoice(false);
    };

    ws.onclose = () => {
      wsActive.current = false;
      wsRef.current = null;
      setCanUseVoice(false);
    };

    const onText = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string }>).detail;
      if (!detail?.text) return;
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "text", text: detail.text }));
    };
    window.addEventListener("cc:callText", onText);

    return () => {
      window.removeEventListener("cc:callText", onText);
      stopMic?.();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { ws.send(JSON.stringify({ type: "hangup" })); } catch { /* ignore */ }
        try { ws.close(); } catch { /* ignore */ }
      }
      wsRef.current = null;
      wsActive.current = false;
      setCanUseVoice(false);
    };
  }, [wsUrl, characterId]);

  // Close WS when call ends (call becomes null)
  useEffect(() => {
    if (!call && wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: "hangup" })); wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null; wsActive.current = false; setCanUseVoice(false);
    }
  }, [call]);

  // ── Browser STT fallback (only when GPU WS is not streaming) ─────────────
  useEffect(() => {
    if (!call || call.phase !== "listening" || call.muted) { setCanUseVoice((v) => wsActive.current ? v : false); return; }
    // If GPU WS is active, it handles voice — browser STT not needed
    if (wsActive.current) { setCanUseVoice(true); return; }
    // Fallback: use browser speech recognition for typed-turn mode
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
  }, [call?.characterId, call?.phase, call?.muted, call?.wsUrl, submit]);

  return { level, transcript, draft, setDraft, submit, captions: true, canUseVoice, heard };
}
