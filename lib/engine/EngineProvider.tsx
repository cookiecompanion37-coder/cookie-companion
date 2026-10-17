"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, ReactNode } from "react";
import { refillIfNewDay, spendText, textsLeft } from "@/lib/credits";
import { callChatApi } from "@/lib/engine/api";
import { BATCH_IDLE_MS, deliveredDelay, preTypingDelay, seenDelay, typingDuration } from "@/lib/engine/timing";
import { appendMessage, emptyChat, findCharacter, makeRequest, newMessage } from "@/lib/engine/engineUtils";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { getState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import type { CallLog, ChatEvent, ChatResponse, Reaction } from "@/lib/types";
import { stopSpeaking } from "@/lib/voice";
import { useToast } from "@/components/ui/Toast";
import { useCallControls } from "@/lib/engine/useCallControls";
import type { CallSession, Engine } from "@/lib/engine/types";
export type { CallPhase, CallSession, Engine } from "@/lib/engine/types";

const EngineContext = createContext<Engine | null>(null);

type TimerCancel = () => void;
export function EngineProvider({ children }: { children: ReactNode }): JSX.Element {
  const nav = useNav(); const { toast } = useToast();
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [busyUntil] = useState<Record<string, number | null>>({});
  const [quickReplies, setQuickReplies] = useState<Record<string, string[]>>({});
  const [incoming, setIncoming] = useState<{ characterId: string } | null>(null);
  const [call, setCall] = useState<CallSession | null>(null);
  const busyRef = useRef<Record<string, number | null>>({}); const activeRef = useRef<string | null>(null);
  const incomingAt = useRef(0); const incomingDirection = useRef<CallLog["direction"]>("outgoing");
  const callStartedAt = useRef(0); const callEnding = useRef(false); const callRef = useRef<CallSession | null>(null);
  const epochs = useRef(new Map<string, number>());
  const batches = useRef(new Map<string, number>());
  const controllers = useRef(new Map<string, AbortController>()); const timers = useRef(new Map<number, TimerCancel>()); const disposed = useRef(false);
  callRef.current = call;

  const cancelTimer = (id: number) => { const cancel = timers.current.get(id); if (cancel) { timers.current.delete(id); cancel(); } };
  const later = (fn: () => void, ms: number): number => {
    let id = 0; id = window.setTimeout(() => { timers.current.delete(id); if (!disposed.current) fn(); }, ms);
    timers.current.set(id, () => window.clearTimeout(id)); return id;
  };
  const delay = (ms: number): Promise<boolean> => new Promise((resolve) => {
    let id = 0; id = window.setTimeout(() => { timers.current.delete(id); resolve(!disposed.current); }, ms);
    timers.current.set(id, () => { window.clearTimeout(id); resolve(false); });
  });
  const bump = (id: string): number => { const next = (epochs.current.get(id) ?? 0) + 1; epochs.current.set(id, next); return next; };
  const current = (id: string, epoch: number): boolean => !disposed.current && epochs.current.get(id) === epoch;
  const abortCharacter = (id: string) => { controllers.current.get(id)?.abort(); controllers.current.delete(id); };
  const clearBatch = (id: string) => { const timer = batches.current.get(id); if (timer !== undefined) { cancelTimer(timer); batches.current.delete(id); } };
  const setTypingFor = (id: string, value: boolean) => setTyping((state) => ({ ...state, [id]: value }));
  const addAI = (id: string, text: string, epoch: number) => {
    if (!current(id, epoch)) return;
    const message = newMessage("assistant", text);
    setState((state) => appendMessage(state, id, message, activeRef.current !== id));
    sfx.pop(); haptic("tap");
  };
  // ── Zero LLM request: ONLY for text chat mode ─────────────────────────────
  // Call mode (voice) is handled entirely by the GPU WebSocket in useCallSession.
  // This function must NEVER be called with mode="call" anymore.
  const requestEvent = async (id: string, event: ChatEvent, epoch: number, busyRoll = false, callSeconds?: number): Promise<void> => {
    const state = getState(); const character = findCharacter(state, id);
    if (!character || !current(id, epoch)) return;
    const controller = new AbortController(); controllers.current.set(id, controller);
    const remaining = Math.max(0, Math.ceil(((busyRef.current[id] ?? 0) - Date.now()) / 1000));
    const req = makeRequest(state, character, id, event, "chat", busyRoll, remaining, 0, callSeconds);
    const pending = event === "message" ? (state.chats[id]?.messages ?? []).filter((msg) => msg.role === "user" && msg.status === "sent").map((msg) => msg.id) : [];
    const responsePromise = callChatApi(req, controller.signal);
    if (pending.length && await delay(deliveredDelay()) && current(id, epoch)) setState((currentState) => {
      const chat = currentState.chats[id]; if (!chat) return currentState;
      return { ...currentState, chats: { ...currentState.chats, [id]: { ...chat, messages: chat.messages.map((msg) => pending.includes(msg.id) ? { ...msg, status: "delivered" } : msg) } } };
    });
    const response = await responsePromise;
    if (controllers.current.get(id) === controller) controllers.current.delete(id);
    if (!current(id, epoch)) return;
    if (pending.length && await delay(seenDelay()) && current(id, epoch)) setState((currentState) => {
      const chat = currentState.chats[id]; if (!chat) return currentState;
      return { ...currentState, chats: { ...currentState.chats, [id]: { ...chat, messages: chat.messages.map((msg) => pending.includes(msg.id) ? { ...msg, status: "seen" } : msg) } } };
    });
    await applyResponse(id, response, event, epoch, pending.at(-1));
  };

  const applyResponse = async (id: string, response: ChatResponse, event: ChatEvent, epoch: number, lastUserId?: string): Promise<void> => {
    if (response.reaction) {
      if (!await delay(300) || !current(id, epoch)) return;
      setState((state) => {
        const chat = state.chats[id]; if (!chat) return state;
        const targetId = lastUserId ?? [...chat.messages].reverse().find((message) => message.role === "user")?.id;
        if (!targetId) return state;
        return { ...state, chats: { ...state.chats, [id]: { ...chat, messages: chat.messages.map((message) => message.id === targetId ? { ...message, reactions: [...message.reactions.filter((item) => item.by !== "ai"), { emoji: response.reaction as Reaction, by: "ai" }] } : message) } } };
      });
      sfx.react(); haptic("react");
    }
    for (const [index, text] of response.bubbles.entries()) {
      if (!await delay(preTypingDelay(index === 0)) || !current(id, epoch)) return;
      setTypingFor(id, true);
      if (!await delay(typingDuration(text, index === 0)) || !current(id, epoch)) return;
      setTypingFor(id, false); addAI(id, text, epoch);
    }
    setTypingFor(id, false);
    if (response.quickReplies.length) setQuickReplies((state) => ({ ...state, [id]: response.quickReplies }));
    if (response.memory.length) {
      const facts: string[] = [];
      setState((state) => {
        const currentMemory = state.memory[id] ?? [];
        const unique = [...currentMemory];
        for (const fact of response.memory) if (!unique.includes(fact) && unique.length < 12) { unique.push(fact); facts.push(fact); }
        return { ...state, memory: { ...state.memory, [id]: unique } };
      });
      if (facts[0]) toast(`${findCharacter(getState(), id)?.name ?? "Your companion"} will remember: ${facts[0]}`, "🍪");
    }
    if (response.safety === "crisis") {
      const crisisMessage = newMessage("assistant", "You deserve real support. If you can, reach out to someone you trust now.", "crisis");
      setState((state) => appendMessage(state, id, crisisMessage, activeRef.current !== id));
    }
    if (response.safety === "minor") nav.openSheet({ name: "minorGate" });
    if (response.safety === "crisis") nav.openSheet({ name: "safety" });
    if (response.call === "ring") {
      incomingDirection.current = event === "callback_due" ? "incoming" : "outgoing";
      incomingAt.current = Date.now(); setIncoming({ characterId: id });
    }
  };

  const startChat = (id: string): void => {
    const snapshot = getState(); const character = findCharacter(snapshot, id);
    if (!character) return;
    const existing = snapshot.chats[id];
    if (!existing) setState((state) => ({ ...state, chats: { ...state.chats, [id]: emptyChat(id) } }));
    activeRef.current = id;
    if ((existing?.messages.length ?? 0) > 0) return;
    const epoch = bump(id); abortCharacter(id);
    later(() => {
      if (!current(id, epoch)) return;
      setTypingFor(id, true);
      later(() => {
        if (!current(id, epoch)) return;
        setTypingFor(id, false); addAI(id, character.greeting, epoch);
        setQuickReplies((state) => ({ ...state, [id]: ["tell me more", "just saying hi", "what are you up to?"] }));
      }, typingDuration(character.greeting, true));
    }, 750);
  };

  const openChat = (id: string): void => {
    activeRef.current = id || null;
    if (!id) return;
    setState((state) => {
      const chat = state.chats[id];
      return chat ? { ...state, chats: { ...state.chats, [id]: { ...chat, unread: 0 } } } : state;
    });
  };

  const send = (id: string, rawText: string, opts: { kind?: "text" | "voice"; durationSec?: number } = {}): void => {
    const text = rawText.trim().slice(0, 2000); const snapshot = getState(); const character = findCharacter(snapshot, id);
    if (!text || !character) return;
    const ready = refillIfNewDay(snapshot);
    if (textsLeft(ready) <= 0) { toast("Your chats refill at midnight", "🍪"); return; }
    const kind = opts.kind ?? "text";
    const message = newMessage("user", kind === "voice" ? "Voice note" : text, kind, opts.durationSec);
    setState((state) => appendMessage(spendText(state), id, { ...message, status: "sent" }, false, true));
    const epoch = bump(id); abortCharacter(id); setTypingFor(id, false); clearBatch(id);
    const timer = later(() => {
      batches.current.delete(id);
      void requestEvent(id, "message", epoch, false);
    }, BATCH_IDLE_MS);
    batches.current.set(id, timer);
  };

  const react = (id: string, msgId: string, emoji: Reaction | null): void => {
    setState((state) => {
      const chat = state.chats[id]; if (!chat) return state;
      return { ...state, chats: { ...state.chats, [id]: { ...chat, messages: chat.messages.map((message) => {
        if (message.id !== msgId) return message;
        const mine = message.reactions.find((entry) => entry.by === "user");
        const reactions = message.reactions.filter((entry) => entry.by !== "user");
        return { ...message, reactions: emoji && mine?.emoji !== emoji ? [...reactions, { emoji, by: "user" }] : reactions };
      }) } } };
    });
    if (emoji) { sfx.react(); haptic("react"); }
  };

  const requestCall = (id: string): void => send(id, "can you call me?");

  const callControls = useCallControls({
    incoming, setIncoming, call, setCall, callRef, callStartedAt, callEnding, incomingAt, incomingDirection, nav,
    bump, abortCharacter, later, requestEvent,
  });

  // ── GPU WebSocket → call state bridge ─────────────────────────────────────
  // useCallSession dispatches these events to update call phase/AI text without prop-drilling.
  useEffect(() => {
    const onPhase = (e: Event) => {
      const { characterId, phase } = (e as CustomEvent<{ characterId: string; phase: string }>).detail;
      setCall((session) => session?.characterId === characterId ? { ...session, phase: phase as import("@/lib/engine/types").CallPhase } : session);
    };
    const onAi = (e: Event) => {
      const { characterId, text } = (e as CustomEvent<{ characterId: string; text: string }>).detail;
      setCall((session) => session?.characterId === characterId ? { ...session, ai: text, phase: "speaking" } : session);
    };
    window.addEventListener("cc:callPhase", onPhase);
    window.addEventListener("cc:callAi", onAi);
    return () => { window.removeEventListener("cc:callPhase", onPhase); window.removeEventListener("cc:callAi", onAi); };
  }, []);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      for (const cancel of timers.current.values()) cancel();
      timers.current.clear(); controllers.current.forEach((controller) => controller.abort()); controllers.current.clear();
      stopSpeaking();

    };
  }, []);

  const engine = useMemo<Engine>(() => ({
    typing, busyUntil, quickReplies, incoming, call, startChat, openChat, send, react, requestCall, ...callControls,
  }), [typing, busyUntil, quickReplies, incoming, call]);
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): Engine {
  const value = useContext(EngineContext);
  if (!value) throw new Error("useEngine must be used within EngineProvider");
  return value;
}
