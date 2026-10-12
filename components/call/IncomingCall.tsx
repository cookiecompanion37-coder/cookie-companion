"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Cookie } from "@/components/ui/Cookie";
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

  useEffect(() => {
    if (!incoming) return;
    const stop = sfx.ring();
    haptic("ring");
    const timer = window.setTimeout(() => declineRef.current(), CALL_RING_SEC * 1000);
    return () => { window.clearTimeout(timer); stop(); };
  }, [incoming?.characterId]);
  if (!incoming || !character) return null;

  return <motion.div className="absolute inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden px-7 pb-[max(36px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))] text-center text-choc" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => { swipeStart.current = event.clientY; }} onPointerUp={(event) => { if (swipeStart.current !== null && swipeStart.current - event.clientY > 85) answer(); swipeStart.current = null; }} onPointerCancel={() => { swipeStart.current = null; }} style={{ background: `radial-gradient(circle at 50% 35%,${character.accent}88,${character.accent}45 38%,#fff1df 100%)` }}>
    <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />
    <div className="relative z-10 flex items-center gap-2"><Cookie size={30} mood="wave" bites={1} /><span className="font-display text-sm font-bold">Cookie · voice call</span></div>
    <div className="relative z-10 flex flex-col items-center">
      <div className="relative grid h-[250px] w-[250px] place-items-center">
        {[0, 1, 2].map((ring) => <motion.span key={ring} className="absolute rounded-full border border-white/65" style={{ inset: `${ring * 15}px` }} animate={{ scale: [1, 1.15, 1], opacity: [.2, .55, .2] }} transition={{ duration: 2.4, delay: ring * .35, repeat: Infinity }} />)}
        <Avatar character={character} size={150} ring />
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold">{character.name}</h1>
      <p className="mt-2 rounded-full bg-white/55 px-4 py-2 text-sm font-semibold">is calling you…</p>
      <p className="mt-5 text-xs font-semibold text-choc-soft">AI companion · take your time</p>
    </div>
    <div className="relative z-10 w-full">
      <div className="mb-5 flex justify-center"><motion.span animate={{ y: [0, -8, 0] }} transition={{ duration: 1.3, repeat: Infinity }} className="rounded-full bg-white/55 px-4 py-2 text-xs font-bold">slide up to answer · or tap</motion.span></div>
      <div className="flex items-center justify-center gap-16">
        <button type="button" onClick={decline} aria-label="Decline call" className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-danger text-white shadow-xl"><PhoneOff size={26} /></button>
        <motion.button type="button" onClick={answer} aria-label="Answer call" whileTap={{ scale: .92 }} className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-ok text-white shadow-xl"><Phone size={29} fill="currentColor" /></motion.button>
      </div>
    </div>
  </motion.div>;
}
