"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button, Chip } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { INTERESTS, VIBES } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { setState, useAppState } from "@/lib/store";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";

export function OnboardingScreen(): React.JSX.Element {
  const state = useAppState();
  const { startChat } = useEngine();
  const nav = useNav();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.session?.name ?? "");
  const [vibe, setVibe] = useState(state.session?.vibe || "Cozy");
  const [interests, setInterests] = useState<string[]>(state.session?.interests ?? []);
  const [selected, setSelected] = useState(SEED_CHARACTERS[0]?.id ?? "create");
  const toggle = (interest: string) => setInterests((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest].slice(0, 5));
  const canNext = step !== 0 || name.trim().length > 0;

  const finish = () => {
    setState((current) => ({ ...current, stage: "main", session: { name: name.trim() || "friend", email: current.session?.email ?? "", vibe, interests } }));
    if (selected === "create") { nav.push({ name: "create" }); return; }
    startChat(selected);
    nav.push({ name: "chat", characterId: selected });
  };

  return (
    <WScreen>
      <main className="relative z-10 flex h-full flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => step === 0 ? setState((current) => ({ ...current, stage: "signin" })) : setStep(step - 1)} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#8a4258]"><ArrowLeft size={19} /></button>
          <span className="rounded-full bg-white/60 px-3 py-1.5 text-[10px] font-bold text-[#a33b5e]">{step + 1} of 3</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/55">
          <motion.div className="h-full rounded-full brand-gradient" animate={{ width: `${((step + 1) / 3) * 100}%` }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
        </div>

        <section className="no-scrollbar mt-6 flex-1 overflow-y-auto pb-4">
          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a33b5e]">First things first</p>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.12] text-[#34101d]">What do they<br />call you?</h1>
              <p className="mt-2 text-[13px] text-[#7d4a5d]">A name makes it feel like yours.</p>
              <input autoFocus autoComplete="given-name" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="glass mt-6 min-h-14 w-full rounded-[20px] px-4 text-[17px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/70 focus:ring-2 focus:ring-[#ffb4cb]" />
              <p className="mt-2 text-[11px] text-[#966377]">You can change this later in Me.</p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a33b5e]">Make it yours</p>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.12] text-[#34101d]">Pick your kind<br />of cozy.</h1>
              <h2 className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Your vibe</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">{VIBES.map((item) => <Chip key={item} selected={vibe === item} onClick={() => setVibe(item)}>{item}</Chip>)}</div>
              <h2 className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">A few things you like</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">{INTERESTS.map((item) => <Chip key={item} selected={interests.includes(item)} onClick={() => toggle(item)}>{item}</Chip>)}</div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a33b5e]">Say hello</p>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.12] text-[#34101d]">Who are you<br />meeting first?</h1>
              <div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                {SEED_CHARACTERS.slice(0, 6).map((character) => {
                  const active = selected === character.id;
                  return (
                    <button key={character.id} type="button" onClick={() => setSelected(character.id)} className={`press relative w-[128px] shrink-0 overflow-hidden rounded-[22px] border text-left transition-all ${active ? "border-[#f5286e] shadow-[0_18px_30px_-18px_rgba(214,18,83,.7)]" : "border-white/70"}`}>
                      <div className="relative aspect-[3/4] w-full">
                        <img src={character.photo} alt={character.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(30,5,15,.72))]" />
                        {active && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full brand-gradient text-white"><Check size={13} /></span>}
                        <span className="absolute inset-x-2.5 bottom-2 text-white">
                          <strong className="block font-display text-[14px] font-semibold">{character.name}</strong>
                          <small className="line-clamp-1 text-[9.5px] opacity-80">{character.tagline}</small>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setSelected("create")} className={`press mt-1 flex w-full items-center gap-3 rounded-[20px] border p-3 text-left ${selected === "create" ? "border-[#f5286e] bg-white/70" : "border-white/70 bg-white/45"}`}>
                <span className="grid h-11 w-11 place-items-center rounded-[15px] brand-gradient text-white"><Sparkles size={19} /></span>
                <span className="flex-1"><strong className="block font-display text-[14px] font-semibold">Create your own</strong><small className="text-[11px] text-[#8a596b]">Describe their look, we&apos;ll make the photos.</small></span>
                <ArrowRight size={16} className="text-[#a33b5e]" />
              </button>
            </motion.div>
          )}
        </section>

        <div className="flex gap-2.5">
          {step > 0 && <Button variant="soft" onClick={() => setStep(step - 1)} className="w-[92px]">Back</Button>}
          <Button full size="lg" disabled={!canNext} onClick={() => step < 2 ? setStep(step + 1) : finish()}>
            {step === 2 ? "Start chatting" : "Next"}
          </Button>
        </div>
      </main>
    </WScreen>
  );
}
