"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Trash2, Sparkles, Brain, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie, CookieMark } from "@/components/ui/Cookie";
import { CreditRing } from "@/components/ui/CreditRing";
import { PLANS } from "@/lib/constants";
import { callRingCapacity, callSecondsLeft, textsLeft, textsLimit } from "@/lib/credits";
import { useNav } from "@/lib/nav";
import { useAppState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "haptics", label: "Haptics", helper: "Little taps for buttons and reactions." },
  { key: "sounds", label: "Sounds", helper: "Soft pops and tiny call rings." },
  { key: "captions", label: "Call captions", helper: "Keep spoken words visible during calls." },
  { key: "reduceMotion", label: "Reduce motion", helper: "Calmer transitions and a still background." },
] as const;

function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle(): void }): React.JSX.Element {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} className={cn("relative h-8 w-[52px] shrink-0 rounded-full border transition-colors", on ? "border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] [background:linear-gradient(135deg,#ffb7d9,#c9b6ff)]" : "border-white/70 bg-choc/15")}>
    <motion.span layout transition={{ type: "spring", stiffness: 520, damping: 34 }} className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow", on ? "left-[22px]" : "left-1")}/>
  </button>;
}

export function MeScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav();
  useEffect(() => { sfx.setEnabled(state.settings.sounds); document.documentElement.dataset.reduce = state.settings.reduceMotion ? "1" : "0"; }, [state.settings.sounds, state.settings.reduceMotion]);
  const toggle = (key: typeof OPTIONS[number]["key"]) => setState((current) => ({ ...current, settings: { ...current.settings, [key]: !current.settings[key] } }));
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[105px] pt-[max(26px,env(safe-area-inset-top))]"><div className="mesh-bg"/>
    <header className="shrink-0"><h1 className="font-display text-[27px] font-bold">Me</h1></header>
    <section className="no-scrollbar mt-4 flex-1 space-y-4 overflow-y-auto pb-5">
      <div className="clay flex items-center gap-3 p-4"><div className="grid h-14 w-14 place-items-center rounded-[20px] text-2xl shadow-[inset_0_2px_0_rgba(255,255,255,.9)] [background:linear-gradient(150deg,#ffe3bb,#ffc3de_55%,#cdb9ff)]">🙂</div><div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{state.session?.name || "Cookie guest"}</h2><p className="text-xs text-choc-soft">Your conversations live on this device.</p></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{PLANS[state.plan].name}</span></div>
      <div className="clay p-4"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Your plan</h2><p className="mt-1 text-xs text-choc-soft">A little room for more conversation.</p></div><Cookie size={60} mood="happy" bites={2}/></div><div className="mt-2 flex items-center justify-center gap-4"><CreditRing icon="💬" label={state.plan === "max" ? "fair use" : `${textsLeft(state)} left`} value={textsLeft(state) / Math.max(textsLimit(state), 1)}/><CreditRing icon="📞" label={`${Math.floor(callSecondsLeft(state) / 60)} min`} value={callSecondsLeft(state) / Math.max(callRingCapacity(state), 1)}/></div><Button full className="mt-3" onClick={() => nav.openSheet({ name: "paywall" })}><Sparkles size={16}/>Explore plans</Button></div>
      <button type="button" onClick={() => nav.openSheet({ name: "memory" })} className="clay flex min-h-16 w-full items-center gap-3 p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-lavender/45"><Brain size={20}/></span><span className="flex-1"><strong className="block font-display">Memory</strong><small className="text-choc-soft">See or clear what companions remember.</small></span><span aria-hidden="true">›</span></button>
      <div className="clay p-4"><h2 className="font-display text-lg font-bold">Settings</h2><div className="mt-2 divide-y divide-choc/5">{OPTIONS.map((option) => <div key={option.key} className="flex min-h-[62px] items-center gap-3 py-2"><span className="min-w-0 flex-1"><strong className="block text-sm">{option.label}</strong><small className="text-xs text-choc-soft">{option.helper}</small></span><Toggle on={state.settings[option.key]} label={option.label} onToggle={() => toggle(option.key)}/></div>)}</div></div>
      <div className="clay p-4"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-ok"/><h2 className="font-display text-lg font-bold">Safety & support</h2></div><p className="mt-2 text-sm leading-relaxed text-choc-soft">Cookie is an AI companion, not a person or professional service. You can report a character or find real-world support.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="clay" size="sm" onClick={() => nav.openSheet({ name: "safety" })}><ShieldAlert size={15}/>Crisis resources</Button><Button variant="clay" size="sm" onClick={() => nav.openSheet({ name: "report" })}>Report a character</Button></div></div>
      <button type="button" onClick={() => nav.openSheet({ name: "deleteData" })} className="flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-danger/10 px-4 text-left font-bold text-danger"><Trash2 size={18}/>Delete all my data</button>
      <div className="flex flex-col items-center pb-3 text-center text-xs leading-relaxed text-choc-soft/75"><CookieMark size={46} className="opacity-90"/><p className="mt-2 font-display text-sm font-bold text-choc">Cookie · version 1.0</p><p className="mt-1">Your AI companions are fictional characters created for conversation.</p></div>
    </section>
  </main>;
}
