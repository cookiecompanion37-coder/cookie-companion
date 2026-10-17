"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useEngine } from "@/lib/engine/EngineProvider";
import { CALL_RING_SEC } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { useAppState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import { haptic } from "@/lib/haptics";

export function IncomingCall(): React.JSX.Element | null {
  const { incoming, answer, decline } = useEngine();
  const state = useAppState();
  const declineRef = useRef(decline);
  const swipeStart = useRef<number | null>(null);
  declineRef.current = decline;
  const character = incoming ? state.customCharacters.find((item) => item.id === incoming.characterId) ?? SEED_CHARACTERS.find((item) => item.id === incoming.characterId) : undefined;

  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    if (!incoming) return;
    const outgoing = incoming.direction === "outgoing";
    const stop = sfx.ring();
    haptic("ring");
    // Outgoing calls connect on their own; incoming calls ring until answered or missed.
    const timer = window.setTimeout(() => outgoing ? answerRef.current() : declineRef.current(), outgoing ? 1500 : CALL_RING_SEC * 1000);
    return () => { window.clearTimeout(timer); stop(); };
  }, [incoming?.characterId, incoming?.direction]);
  if (!incoming || !character) return null;

  return (
    <motion.div
      className="absolute inset-0 z-[80] flex flex-col overflow-hidden bg-[#240812] text-white"
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(event) => { swipeStart.current = event.clientY; }}
      onPointerUp={(event) => { if (swipeStart.current !== null && swipeStart.current - event.clientY > 85) answer(); swipeStart.current = null; }}
      onPointerCancel={() => { swipeStart.current = null; }}
    >
      {character.photo ? (
        <img src={character.photo} alt={character.name} className="absolute inset-0 h-full w-full scale-110 object-cover blur-[3px]" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${character.accent}, #3a1229)` }} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_18%,rgba(255,255,255,.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,12,.5)_0%,rgba(20,4,12,.2)_35%,rgba(20,4,12,.88)_100%)]" />

      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-[max(26px,env(safe-area-inset-top))] text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
        <Sparkles size={10} /> Cookie · incoming call
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative grid h-[230px] w-[230px] place-items-center">
          {[0, 1, 2].map((ring) => (
            <motion.span key={ring} className="absolute rounded-full border border-white/40" style={{ inset: `${ring * 20}px` }} animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.5, 0.15] }} transition={{ duration: 2.4, delay: ring * 0.32, repeat: Infinity }} />
          ))}
          <Avatar character={character} size={150} shape="circle" ring />
        </div>
        <h1 className="mt-4 font-display text-[34px] font-semibold leading-tight">{character.name}</h1>
        <p className="mt-1 text-[12px] font-medium text-white/75">{incoming.direction === "outgoing" ? "calling… pick up together" : "is calling you…"}</p>
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7fe3b4]" />{incoming.direction === "outgoing" ? "connecting · takes a second" : "AI companion · take your time"}</p>
      </div>

      <div className="relative z-10 w-full px-8 pb-[max(32px,env(safe-area-inset-bottom))]">
        <motion.p animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="mb-6 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">{incoming.direction === "outgoing" ? "ringing… tap to connect now" : "slide up to answer · or tap"}</motion.p>
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={decline} aria-label="Decline call" className="press grid h-[62px] w-[62px] place-items-center rounded-full bg-[#e5395c] text-white shadow-xl"><PhoneOff size={24} /></button>
            <span className="text-[9px] font-semibold text-white/65">{incoming.direction === "outgoing" ? "cancel" : "decline"}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <motion.button type="button" onClick={answer} aria-label="Answer call" whileTap={{ scale: 0.9 }} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="grid h-[74px] w-[74px] place-items-center rounded-full bg-[#45b98a] text-white shadow-[0_18px_34px_-12px_rgba(69,185,138,.9)]"><Phone size={28} fill="currentColor" /></motion.button>
            <span className="text-[9px] font-semibold text-white/65">answer</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
