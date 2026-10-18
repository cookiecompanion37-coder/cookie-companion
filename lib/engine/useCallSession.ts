"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEngine } from "@/lib/engine/EngineProvider";
import { CallAudioPlayer } from "@/lib/engine/callAudio";

function startMicStream(ws: WebSocket, allowed: () => boolean, onLevel: (level: number) => void, onError: () => void): () => void {
  let context: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let stream: MediaStream | null = null;
  let cancelled = false;
  void navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  }).then(async (media) => {
    if (cancelled) { media.getTracks().forEach((track) => track.stop()); return; }
    stream = media;
    context = new AudioContext({ sampleRate: 16000 });
    await context.resume();
    if (cancelled) return;
    const source = context.createMediaStreamSource(media);
    // The GPU protocol requires 16 kHz PCM; the output buffer stays silent.
    processor = context.createScriptProcessor(1024, 1, 1);
    processor.onaudioprocess = (event) => {
      event.outputBuffer.getChannelData(0).fill(0);
      if (!allowed() || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 64000) { onLevel(0); return; }
      const samples = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(samples.length);
      let energy = 0;
      for (let index = 0; index < samples.length; index++) {
        energy += samples[index] * samples[index];
        pcm[index] = Math.max(-32768, Math.min(32767, samples[index] * 32768));
      }
      onLevel(Math.min(1, Math.sqrt(energy / samples.length) * 4));
      ws.send(pcm.buffer);
    };
    source.connect(processor);
    processor.connect(context.destination);
  }).catch(() => { if (!cancelled) onError(); });
  return () => {
    cancelled = true;
    if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
    stream?.getTracks().forEach((track) => track.stop());
    if (context && context.state !== "closed") void context.close();
  };
}

export function useCallSession(): {
  level: number; transcript: string; draft: string; setDraft(value: string): void;
  submit(value: string): void; captions: boolean; canUseVoice: boolean; heard: string;
} {
  const { call, callTurn } = useEngine();
  const [transcript, setTranscript] = useState("");
  const [heard, setHeard] = useState("");
  const [draft, setDraft] = useState("");
  const [level, setLevel] = useState(0);
  const [canUseVoice, setCanUseVoice] = useState(false);
  const callRef = useRef(call);
  callRef.current = call;
  const playerRef = useRef<CallAudioPlayer | null>(null);
  const submit = useCallback((value: string) => {
    const text = value.trim();
    if (!text) return;
    callTurn(text); setDraft(""); setTranscript(""); setHeard("");
  }, [callTurn]);
  const wsUrl = call?.wsUrl;
  const characterId = call?.characterId;

  useEffect(() => {
    if (!wsUrl || !characterId) return;
    let disposed = false;
    let stopMic: (() => void) | null = null;
    const player = new CallAudioPlayer();
    playerRef.current = player;
    void player.unlock().then(() => player.setEnabled(callRef.current?.speaker ?? true)).catch(() => undefined);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    const phase = (value: string) => {
      if (!disposed) window.dispatchEvent(new CustomEvent("cc:callPhase", { detail: { characterId, phase: value } }));
    };
    const unavailable = () => {
      if (disposed) return;
      stopMic?.(); stopMic = null;
      player.close(); setCanUseVoice(false); setLevel(0);
      window.dispatchEvent(new CustomEvent("cc:callAi", { detail: { characterId, text: "Voice connection lost. Please end the call and try again." } }));
      phase("listening");
    };
    ws.onopen = () => {
      if (disposed) return;
      ws.send(JSON.stringify({ type: "hello" }));
      ws.send(JSON.stringify({ type: "live" }));
      stopMic = startMicStream(ws,
        () => Boolean(!disposed && callRef.current && !callRef.current.muted && callRef.current.phase !== "speaking" && !player.playing),
        setLevel, () => setCanUseVoice(false));
      setCanUseVoice(true); phase("listening");
    };
    ws.onmessage = (event) => {
      if (disposed) return;
      if (typeof event.data !== "string") { player.play(event.data as ArrayBuffer); return; }
      try {
        const message = JSON.parse(event.data) as { type?: string; v?: string; text?: string };
        if (message.type === "state") {
          const value = message.v;
          phase(value === "thinking" || value === "speaking" ? value : "listening");
        }
        if (message.type === "user" && typeof message.text === "string") {
          setTranscript(message.text); setHeard(message.text);
        }
        if (message.type === "bot" && typeof message.text === "string") {
          setTranscript("");
          window.dispatchEvent(new CustomEvent("cc:callAi", { detail: { characterId, text: message.text } }));
        }
        if (message.type === "error") unavailable();
      } catch { /* Ignore malformed upstream events, not the entire call. */ }
    };
    ws.onerror = unavailable;
    ws.onclose = unavailable;
    const onText = (event: Event) => {
      const detail = (event as CustomEvent<{ characterId?: string; text?: string }>).detail;
      if (detail?.characterId === characterId && detail.text && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "text", text: detail.text }));
      }
    };
    window.addEventListener("cc:callText", onText);
    return () => {
      disposed = true;
      window.removeEventListener("cc:callText", onText);
      stopMic?.(); player.close(); playerRef.current = null;
      ws.onopen = null; ws.onmessage = null; ws.onerror = null; ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "hangup" }));
      ws.close(); setCanUseVoice(false); setLevel(0); setTranscript(""); setHeard("");
    };
  }, [wsUrl, characterId]);

  useEffect(() => { playerRef.current?.setEnabled(call?.speaker ?? true); }, [call?.speaker]);
  return { level, transcript, draft, setDraft, submit, captions: true, canUseVoice, heard };
}
