"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { CALL_RING_SEC } from "@/lib/constants";
import { callSecondsLeft, refillIfNewDay, spendCallSeconds } from "@/lib/credits";
import { appendMessage, findCharacter, newMessage, storeCall } from "@/lib/engine/engineUtils";
import type { CallSession, Engine } from "@/lib/engine/types";
import type { Nav } from "@/lib/nav";
import { getState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import type { CallLog, ChatEvent } from "@/lib/types";
import { rand, uid } from "@/lib/utils";
import { speak } from "@/lib/voice";
import { haptic } from "@/lib/haptics";

interface CallControlArgs {
  incoming: { characterId: string } | null;
  setIncoming: Dispatch<SetStateAction<{ characterId: string } | null>>;
  call: CallSession | null;
  setCall: Dispatch<SetStateAction<CallSession | null>>;
  callRef: MutableRefObject<CallSession | null>;
  callStartedAt: MutableRefObject<number>;
  callEnding: MutableRefObject<boolean>;
  incomingAt: MutableRefObject<number>;
  incomingDirection: MutableRefObject<CallLog["direction"]>;
  nav: Nav;
  bump(id: string): number;
  abortCharacter(id: string): void;
  later(fn: () => void, ms: number): number;
  requestEvent(id: string, event: ChatEvent, mode: "chat" | "call", epoch: number, busyRoll?: boolean, callSeconds?: number): Promise<void>;
}

type CallControls = Pick<Engine, "answer" | "decline" | "endCall" | "callTurn" | "setMuted" | "setSpeaker">;
export function useCallControls(args: CallControlArgs): CallControls {
  const exhausting = useRef(false);
  const answer = (): void => {
    const pending = args.incoming; if (!pending) return;
    const id = pending.characterId; args.setIncoming(null); args.incomingAt.current = 0;
    const state = refillIfNewDay(getState());
    setState(() => state);
    if (callSecondsLeft(state) <= 0) { args.nav.openSheet({ name: "outOfMinutes" }); return; }
    if (!findCharacter(state, id)) return;
    args.callEnding.current = false; exhausting.current = false; args.callStartedAt.current = Date.now();
    args.setCall({ characterId: id, phase: "connecting", ai: "", user: "", seconds: 0, muted: false, speaker: true, level: 0 });
    haptic("success"); const epoch = args.bump(id); args.abortCharacter(id);
    void args.requestEvent(id, "call_connected", "call", epoch, false, 0);
  };
  const decline = (): void => {
    const pending = args.incoming; if (!pending) return;
    const id = pending.characterId; const startedAt = args.incomingAt.current || Date.now();
    const missed = Date.now() - startedAt >= (CALL_RING_SEC - 1) * 1000;
    const log: CallLog = { id: uid(), characterId: id, direction: args.incomingDirection.current, outcome: missed ? "missed" : "declined", startedAt, durationSec: 0 };
    args.setIncoming(null); args.incomingAt.current = 0; setState((state) => storeCall(state, log));
    haptic("tap"); args.abortCharacter(id); const epoch = args.bump(id);
    args.later(() => { void args.requestEvent(id, "call_missed", "chat", epoch, false); }, 220);
  };
  const callTurn = (rawText: string): void => {
    const session = args.callRef.current; if (!session || args.callEnding.current) return;
    const text = rawText.trim().split(/\s+/).slice(0, 25).join(" ").slice(0, 500);
    if (!text) return;
    const id = session.characterId; setState((state) => appendMessage(state, id, newMessage("user", text), false, true));
    args.setCall((current) => current?.characterId === id ? { ...current, phase: "thinking", user: text } : current);
    args.abortCharacter(id); const epoch = args.bump(id);
    void args.requestEvent(id, "call_turn", "call", epoch, false, session.seconds);
  };
  const setMuted = (muted: boolean): void => args.setCall((session) => session ? { ...session, muted } : session);
  const setSpeaker = (speaker: boolean): void => args.setCall((session) => session ? { ...session, speaker } : session);
  const finishCall = (forCredits = false): void => {
    const session = args.callRef.current; if (!session || args.callEnding.current) return;
    args.callEnding.current = true; exhausting.current = false; sfx.hangup();
    const logId = uid(); const startedAt = args.callStartedAt.current || Date.now();
    const log: CallLog = { id: logId, characterId: session.characterId, direction: args.incomingDirection.current, outcome: "answered", startedAt, durationSec: session.seconds };
    setState((state) => storeCall(state, log)); args.setCall(null); args.callRef.current = null;
    args.nav.openSheet(forCredits ? { name: "outOfMinutes" } : { name: "callSummary", logId });
    if (!forCredits) args.later(() => {
      const epoch = args.bump(session.characterId); args.abortCharacter(session.characterId);
      void args.requestEvent(session.characterId, "call_ended", "chat", epoch, false, session.seconds);
    }, rand(2200, 4000));
  };
  const finishRef = useRef(finishCall); finishRef.current = finishCall;

  useEffect(() => {
    if (!args.call) return;
    const characterId = args.call.characterId;
    const ticker = window.setInterval(() => {
      if (args.callEnding.current || exhausting.current) return;
      const state = getState();
      if (callSecondsLeft(state) <= 0) {
        const character = findCharacter(state, characterId);
        if (!character) { finishRef.current(true); return; }
        exhausting.current = true;
        args.setCall((session) => session?.characterId === characterId ? { ...session, phase: "speaking", ai: "i should let you get back to your day. talk soon 💛" } : session);
        speak("i should let you get back to your day. talk soon.", character, { onEnd: () => undefined });
        window.clearInterval(ticker); args.later(() => finishRef.current(true), 1700);
        return;
      }
      setState((current) => spendCallSeconds(current, 1));
      args.setCall((session) => session?.characterId === characterId ? { ...session, seconds: session.seconds + 1 } : session);
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [args.call?.characterId]);

  return { answer, decline, endCall: () => finishCall(false), callTurn, setMuted, setSpeaker };
}
