"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Chip } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { INTERESTS, VIBES } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { useAppState, setState } from "@/lib/store";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";

export function OnboardingScreen(): React.JSX.Element {
  const state = useAppState(); const { startChat } = useEngine(); const nav = useNav();
  const [step, setStep] = useState(0); const [name, setName] = useState(state.session?.name ?? ""); const [vibe, setVibe] = useState(state.session?.vibe ?? "Cozy"); const [interests, setInterests] = useState<string[]>(state.session?.interests ?? []); const [selected, setSelected] = useState(SEED_CHARACTERS[0]?.id ?? "");
  const valid = step !== 0 || name.trim().length > 0;
  const toggle = (interest: string) => setInterests((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest]);
  const next = () => {
    if (!valid) return;
    if (step < 2) { setStep(step + 1); return; }
    setState((current) => ({ ...current, stage: "main", session: { name: name.trim(), vibe, interests } }));
    if (selected === "create") nav.push({ name: "create" });
    else { startChat(selected); nav.push({ name: "chat", characterId: selected }); }
  };
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
    <div className="mesh-bg"/><div className="flex items-center justify-between"><span className="font-display text-xl font-bold">Let&apos;s make this yours</span><span className="text-xs font-bold text-choc-soft">{step + 1} of 3</span></div><div className="mt-3 h-2 rounded-full bg-white/70"><motion.div className="h-full rounded-full bg-biscuit" animate={{ width: `${(step + 1) * 33.333}%` }}/></div>
    <section className="no-scrollbar mt-5 flex-1 overflow-y-auto pb-4">
      {step === 0 && <div><h1 className="font-display text-3xl font-bold">What should we call you?</h1><p className="mt-2 text-sm text-choc-soft">A name helps conversations feel a little more personal.</p><input autoComplete="given-name" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="clay mt-6 min-h-14 w-full rounded-[20px] px-4 outline-none focus:ring-2 focus:ring-biscuit"/><p className="mt-2 text-xs text-choc-soft">You can change this later.</p></div>}
      {step === 1 && <div><h1 className="font-display text-3xl font-bold">Pick your kind of cozy</h1><p className="mt-2 text-sm text-choc-soft">Choose a vibe and a few things you enjoy.</p><h2 className="mt-6 font-display font-bold">Your vibe</h2><div className="mt-3 flex flex-wrap gap-2">{VIBES.map((item) => <Chip key={item} selected={vibe === item} onClick={() => setVibe(item)}>{item}</Chip>)}</div><h2 className="mt-6 font-display font-bold">Things you like</h2><div className="mt-3 flex flex-wrap gap-2">{INTERESTS.map((item) => <Chip key={item} selected={interests.includes(item)} onClick={() => toggle(item)}>{item}</Chip>)}</div></div>}
      {step === 2 && <div><h1 className="font-display text-3xl font-bold">Meet a companion</h1><p className="mt-2 text-sm text-choc-soft">You can change your mind or make your own.</p><div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-3">{SEED_CHARACTERS.slice(0, 6).map((character) => <button key={character.id} type="button" onClick={() => setSelected(character.id)} className={`clay min-w-[170px] rounded-[24px] p-4 text-left transition-transform ${selected === character.id ? "ring-2 ring-biscuit" : ""}`}><Avatar character={character} size={64}/><h2 className="mt-3 font-display text-lg font-bold">{character.name}</h2><p className="mt-1 text-xs leading-relaxed text-choc-soft">{character.tagline}</p></button>)}</div><button type="button" onClick={() => setSelected("create")} className={`clay mt-2 flex min-h-16 w-full items-center gap-3 rounded-[20px] p-3 text-left ${selected === "create" ? "ring-2 ring-biscuit" : ""}`}><span className="grid h-10 w-10 place-items-center rounded-2xl bg-biscuit text-white">＋</span><span><strong className="block font-display">Create your own</strong><small className="text-choc-soft">Your imagination, your rules.</small></span></button></div>}
    </section>
    <div className="mt-2 flex gap-3"><Button variant="clay" full disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</Button><Button full disabled={!valid} onClick={next}>{step === 2 ? "Start chatting" : "Next"}</Button></div>
  </main>;
}
