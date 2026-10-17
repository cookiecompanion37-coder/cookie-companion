"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, ReactNode } from "react";
import { callSecondsLeft, refillIfNewDay, spendText, textsLeft } from "@/lib/credits";
import { awaitPhoto, callChatApi, callGpuImageApi, callGpuVoiceMessage, persistImage, submitPhoto } from "@/lib/engine/api";
import { BATCH_IDLE_MS, deliveredDelay, preTypingDelay, seenDelay, typingDuration } from "@/lib/engine/timing";
import { appendMessage, emptyChat, findCharacter, makeRequest, newMessage, patchMessage } from "@/lib/engine/engineUtils";
import { compressFile, compressFromUrl } from "@/lib/media";
import { haptic } from "@/lib/haptics";
import { useNav } from "@/lib/nav";
import { getState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import type { CallLog, ChatEvent, ChatResponse, GeneratedImagePlan, Reaction } from "@/lib/types";
import { stopSpeaking } from "@/lib/voice";
import { useToast } from "@/components/ui/Toast";
import { useCallControls } from "@/lib/engine/useCallControls";
import {
  claimCallSlot, fetchCallbacks, heartbeatCallSlot, releaseCallSlot, resolveCallback, scheduleCallback, writeBusyNote,
} from "@/lib/callsClient";
import type { CallSession, Engine } from "@/lib/engine/types";
export type { CallPhase, CallSession, Engine } from "@/lib/engine/types";

const EngineContext = createContext<Engine | null>(null);
type TimerCancel = () => void;

export function EngineProvider({ children }: { children: ReactNode }): JSX.Element {
  const nav = useNav();
  const { toast } = useToast();
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [busyUntil, setBusyUntil] = useState<Record<string, number | null>>({});
  const [quickReplies, setQuickReplies] = useState<Record<string, string[]>>({});
  const [incoming, setIncoming] = useState<{ characterId: string; direction: "incoming" | "outgoing" } | null>(null);
  const [call, setCall] = useState<CallSession | null>(null);
  const busyRef = useRef<Record<string, number | null>>({});
  const callbackTimers = useRef(new Map<string, number>());
  const activeRef = useRef<string | null>(null);
  const callWanted = useRef<string | null>(null);
  const incomingAt = useRef(0);
  const incomingDirection = useRef<CallLog["direction"]>("outgoing");
  const callStartedAt = useRef(0);
  const callEnding = useRef(false);
  const callRef = useRef<CallSession | null>(null);
  const incomingRef = useRef<{ characterId: string; direction: "incoming" | "outgoing" } | null>(null);
  const pendingCallback = useRef<string | null>(null);
  const seenCallbacks = useRef(new Set<string>());
  const epochs = useRef(new Map<string, number>());
  const batches = useRef(new Map<string, number>());
  const controllers = useRef(new Map<string, AbortController>());
  const timers = useRef(new Map<number, TimerCancel>());
  const disposed = useRef(false);
  callRef.current = call;
  incomingRef.current = incoming;

  const cancelTimer = (id: number) => { const cancel = timers.current.get(id); if (cancel) { timers.current.delete(id); cancel(); } };
  const later = (fn: () => void, ms: number): number => {
    let id = 0;
    id = window.setTimeout(() => { timers.current.delete(id); if (!disposed.current) fn(); }, ms);
    timers.current.set(id, () => window.clearTimeout(id));
    return id;
  };
  const delay = (ms: number): Promise<boolean> => new Promise((resolve) => {
    let id = 0;
    id = window.setTimeout(() => { timers.current.delete(id); resolve(!disposed.current); }, ms);
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

  /** Generate the photo the model asked for, then swap the placeholder for the real image. */
  const generatePhoto = async (id: string, plan: GeneratedImagePlan, epoch: number): Promise<void> => {
    const character = findCharacter(getState(), id);
    if (!character || !current(id, epoch)) return;
    const placeholder = newMessage("assistant", "");
    const messageId = placeholder.id;
    placeholder.image = { prompt: plan.prompt, ar: plan.ar, status: "pending" };
    setState((state) => appendMessage(state, id, placeholder, activeRef.current !== id));
    const references = [character.photo, ...character.gallery].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)));
    const task = await submitPhoto({ scene: plan.prompt, appearance: character.appearance, ar: plan.ar, references });
    if (!task) {
      setState((state) => patchMessage(state, id, messageId, { image: { prompt: plan.prompt, ar: plan.ar, status: "failed" } }));
      return;
    }
    const proxyUrl = await awaitPhoto(task.taskId);
    if (!proxyUrl) {
      setState((state) => patchMessage(state, id, messageId, { image: { prompt: plan.prompt, ar: plan.ar, status: "failed" } }));
      return;
    }
    const compressed = await compressFromUrl(proxyUrl, 760, 0.84);
    const stored = compressed ? await persistImage(compressed, `chat/${id}`) : proxyUrl;
    setState((state) => patchMessage(state, id, messageId, { image: { prompt: plan.prompt, ar: plan.ar, status: "ready", url: stored || proxyUrl } }));
  };

  const markBusy = (id: string, until: number | null): void => {
    busyRef.current[id] = until;
    setBusyUntil((map) => ({ ...map, [id]: until }));
  };
  const clearCallback = (id: string): void => {
    const pending = callbackTimers.current.get(id);
    if (pending !== undefined) { cancelTimer(pending); callbackTimers.current.delete(id); }
    if (busyRef.current[id]) markBusy(id, null);
  };

  const requestEvent = async (id: string, event: ChatEvent, epoch: number, busyRoll = false, callSeconds?: number): Promise<void> => {
    const state = getState();
    const character = findCharacter(state, id);
    if (!character || !current(id, epoch)) return;
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const remaining = Math.max(0, Math.ceil(((busyRef.current[id] ?? 0) - Date.now()) / 1000));
    const req = makeRequest(state, character, id, event, "chat", busyRoll, remaining, 0, callSeconds);
    const pending = event === "message" ? (state.chats[id]?.messages ?? []).filter((msg) => msg.role === "user" && msg.status === "sent").map((msg) => msg.id) : [];
    const responsePromise = callChatApi(req, controller.signal);
    if (pending.length && await delay(deliveredDelay()) && current(id, epoch)) setState((currentState) => {
      const chat = currentState.chats[id];
      if (!chat) return currentState;
      return { ...currentState, chats: { ...currentState.chats, [id]: { ...chat, messages: chat.messages.map((msg) => pending.includes(msg.id) ? { ...msg, status: "delivered" } : msg) } } };
    });
    const response = await responsePromise;
    if (controllers.current.get(id) === controller) controllers.current.delete(id);
    if (!current(id, epoch)) return;
    if (pending.length && await delay(seenDelay()) && current(id, epoch)) setState((currentState) => {
      const chat = currentState.chats[id];
      if (!chat) return currentState;
      return { ...currentState, chats: { ...currentState.chats, [id]: { ...chat, messages: chat.messages.map((msg) => pending.includes(msg.id) ? { ...msg, status: "seen" } : msg) } } };
    });
    await applyResponse(id, response, event, epoch, pending.at(-1));
  };

  const applyResponse = async (id: string, response: ChatResponse, event: ChatEvent, epoch: number, lastUserId?: string): Promise<void> => {
    // A tapped call button must ring even when the model is offline or forgets the tool.
    if (event === "message" && callWanted.current === id && response.call === "none") response = { ...response, call: "ring" };
    if (response.call !== "none") callWanted.current = null;
    if (response.reaction) {
      if (!await delay(300) || !current(id, epoch)) return;
      setState((state) => {
        const chat = state.chats[id];
        if (!chat) return state;
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
      setTypingFor(id, false);
      addAI(id, text, epoch);
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
      nav.openSheet({ name: "safety" });
    }
    if (response.safety === "minor") nav.openSheet({ name: "minorGate" });
    if (response.call === "ring" && !callRef.current && !incomingRef.current) {
      const direction = event === "callback_due" ? "incoming" : callWanted.current === id || event === "message" ? "outgoing" : "incoming";
      if (await claimCallSlot(id) && !callRef.current) {
        ringNow(id, direction);
      }
    }
    if (response.image && event === "message") void generatePhoto(id, response.image, epoch);
    if (response.call === "busy" && response.callbackInSec && event !== "callback_due") {
      const wait = Math.min(3600, Math.max(5, response.callbackInSec)) * 1000;
      clearCallback(id);
      markBusy(id, Date.now() + wait);
      const timer = later(() => {
        callbackTimers.current.delete(id);
        markBusy(id, null);
        const nextEpoch = bump(id);
        void requestEvent(id, "callback_due", nextEpoch);
      }, wait);
      callbackTimers.current.set(id, timer);
    }
  };

  const startChat = (id: string): void => {
    const snapshot = getState();
    const character = findCharacter(snapshot, id);
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
        setTypingFor(id, false);
        addAI(id, character.greeting, epoch);
        setQuickReplies((state) => ({ ...state, [id]: ["tell me more", "just saying hi", "what are you up to?"] }));
      }, typingDuration(character.greeting, true));
    }, 700);
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
    const text = rawText.trim().slice(0, 2000);
    const snapshot = getState();
    const character = findCharacter(snapshot, id);
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

  /** Photo attachment: analyse with the GPU when available, otherwise let the chat model react. */
  const sendPhoto = (id: string, file: File, caption: string): void => {
    const character = findCharacter(getState(), id);
    if (!character) return;
    void (async () => {
      const ready = refillIfNewDay(getState());
      if (textsLeft(ready) <= 0) { toast("Your chats refill at midnight", "🍪"); return; }
      const dataUrl = await compressFile(file, 900, 0.84);
      const message = newMessage("user", caption || "", "text");
      message.image = { prompt: caption || "a photo you shared", ar: "4:5", status: "ready", url: dataUrl };
      message.status = "sent";
      setState((state) => appendMessage(spendText(state), id, message, false, true));
      const epoch = bump(id); abortCharacter(id);
      setTypingFor(id, true);
      const reply = await callGpuImageApi(file, { caption: caption || undefined, sessionId: id });
      if (!current(id, epoch)) return;
      if (reply?.text) {
        setTypingFor(id, false);
        addAI(id, reply.text, epoch);
        return;
      }
      setTypingFor(id, false);
      void requestEvent(id, "message", epoch, false);
    })();
  };

  /** Voice note: real STT + TTS through the GPU when online, text fallback otherwise. */
  const sendVoiceNote = (id: string, blob: Blob | null, durationSec: number): void => {
    const character = findCharacter(getState(), id);
    if (!character) return;
    const ready = refillIfNewDay(getState());
    if (textsLeft(ready) <= 0) { toast("Your chats refill at midnight", "🍪"); return; }
    const message = newMessage("user", "Voice note", "voice", durationSec);
    setState((state) => appendMessage(spendText(state), id, { ...message, status: "sent" }, false, true));
    const epoch = bump(id); abortCharacter(id); clearBatch(id);
    if (!blob) { void requestEvent(id, "message", epoch, false); return; }
    setTypingFor(id, true);
    void callGpuVoiceMessage(blob, {
      sessionId: id,
      systemPrompt: `You are ${character.name}, ${character.age}. ${character.personality}. Reply in one or two short, warm spoken sentences.`,
    }).then((reply) => {
      if (!current(id, epoch)) return;
      setTypingFor(id, false);
      if (reply?.text) {
        addAI(id, reply.text, epoch);
        if (reply.audioUrl) {
          try { const audio = new Audio(reply.audioUrl); void audio.play().catch(() => undefined); } catch { /* ignore */ }
        }
      } else {
        void requestEvent(id, "message", epoch, false);
      }
    });
  };

  const react = (id: string, msgId: string, emoji: Reaction | null): void => {
    setState((state) => {
      const chat = state.chats[id];
      if (!chat) return state;
      return {
        ...state,
        chats: {
          ...state.chats,
          [id]: {
            ...chat,
            messages: chat.messages.map((message) => {
              if (message.id !== msgId) return message;
              const mine = message.reactions.find((entry) => entry.by === "user");
              const reactions = message.reactions.filter((entry) => entry.by !== "user");
              return { ...message, reactions: emoji && mine?.emoji !== emoji ? [...reactions, { emoji, by: "user" }] : reactions };
            }),
          },
        },
      };
    });
    if (emoji) { sfx.react(); haptic("react"); }
  };

  /** Ring with a lease already held. The rotator is the single gate for calls. */
  const ringNow = (id: string, direction: CallLog["direction"]): void => {
    callWanted.current = null;
    incomingDirection.current = direction;
    incomingAt.current = Date.now();
    if (direction === "outgoing") clearCallback(id);
    setIncoming({ characterId: id, direction });
  };

  /**
   * Every call claims a slot first (16 physical, 14 usable). When the house is
   * full the companion answers with a written excuse plus a scheduled callback
   * instead of pretending to be available.
   */
  const requestCall = (id: string): void => {
    const character = findCharacter(getState(), id);
    if (!character || callRef.current) return;
    if (callSecondsLeft(refillIfNewDay(getState())) <= 0) { nav.openSheet({ name: "outOfMinutes" }); return; }
    void (async () => {
      const free = await claimCallSlot(id);
      if (callRef.current) { await releaseCallSlot(); return; }
      if (free) {
        ringNow(id, "outgoing");
        send(id, "can you call me?");
        return;
      }
      const snapshot = getState();
      const userName = snapshot.session?.name || "friend";
      const { note, minutes } = await writeBusyNote({ name: character.name, personality: character.personality }, userName);
      if (!getState().chats[id]) setState((state) => ({ ...state, chats: { ...state.chats, [id]: emptyChat(id) } }));
      addAI(id, note, bump(id));
      toast(`${character.name} will call you in about ${minutes} minutes`);
      void scheduleCallback({ characterId: id, characterName: character.name, userName, note, minutes });
    })();
  };

  // Lease heartbeat while a live call is up; drop the lease the moment it ends.
  useEffect(() => {
    if (!call) return;
    const timer = window.setInterval(() => { void heartbeatCallSlot(); }, 30_000);
    return () => { window.clearInterval(timer); void releaseCallSlot(); };
  }, [call?.characterId]);

  // Poll for scheduled callbacks. The cron flips due notes to `ringing`; this is
  // the only thing that turns one into a ring on the device that owns the note.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped || callRef.current || document.visibilityState === "hidden") return;
      const { ringing } = await fetchCallbacks();
      if (stopped || !ringing.length) return;
      const next = ringing.find((entry) => !seenCallbacks.current.has(entry.id));
      if (!next || !findCharacter(getState(), next.characterId)) return;
      if (!await claimCallSlot(next.characterId) || stopped || callRef.current) return;
      seenCallbacks.current.add(next.id);
      pendingCallback.current = next.id;
      ringNow(next.characterId, "incoming");
    };
    const timer = window.setInterval(() => { void poll(); }, 45_000);
    void poll();
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  // Answering resolves the note; letting it ring out records a missed call.
  useEffect(() => {
    const id = pendingCallback.current;
    if (!id) return;
    if (call) { pendingCallback.current = null; void resolveCallback(id, "connected"); return; }
    if (incoming) return;
    const timer = window.setTimeout(() => {
      if (pendingCallback.current !== id) return;
      pendingCallback.current = null;
      if (!callRef.current) void resolveCallback(id, "missed");
    }, 1_400);
    return () => window.clearTimeout(timer);
  }, [Boolean(call), incoming]);

  const callControls = useCallControls({
    incoming, setIncoming, call, setCall, callRef, callStartedAt, callEnding, incomingAt, incomingDirection, nav,
    bump, abortCharacter, later, requestEvent,
  });

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
      timers.current.clear();
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
      stopSpeaking();
    };
  }, []);

  const engine = useMemo<Engine>(() => ({
    typing, busyUntil, quickReplies, incoming, call, startChat, openChat, send, sendPhoto, sendVoiceNote, react, requestCall, ...callControls,
  }), [typing, busyUntil, quickReplies, incoming, call]);
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): Engine {
  const value = useContext(EngineContext);
  if (!value) throw new Error("useEngine must be used within EngineProvider");
  return value;
}
