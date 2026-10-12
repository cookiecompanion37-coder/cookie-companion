"use client";

import { useEffect } from "react";
import { ShieldCheck, Trash2, Sparkles, Brain, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie } from "@/components/ui/Cookie";
import { CreditRing } from "@/components/ui/CreditRing";
import { PLANS } from "@/lib/constants";
import { callRingCapacity, callSecondsLeft, textsLeft, textsLimit } from "@/lib/credits";
import { useNav } from "@/lib/nav";
import { useAppState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";

const OPTIONS = [
  { key: "haptics", label: "Haptics", helper: "Little taps for buttons and reactions." },
  { key: "sounds", label: "Sounds", helper: "Soft pops and tiny call rings." },
  { key: "captions", label: "Call captions", helper: "Keep spoken words visible during calls." },
  { key: "reduceMotion", label: "Reduce motion", helper: "Calmer transitions and a still background." },
] as const;
export function MeScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav();
  useEffect(() => { sfx.setEnabled(state.settings.sounds); document.documentElement.dataset.reduce = state.settings.reduceMotion ? "1" : "0"; }, [state.settings.sounds, state.settings.reduceMotion]);
  const toggle = (key: typeof OPTIONS[number]["key"]) => setState((current) => ({ ...current, settings: { ...current.settings, [key]: !current.settings[key] } }));
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[105px] pt-[max(26px,env(safe-area-inset-top))]"><div className="mesh-bg"/><header className="shrink-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-choc-soft">the little details</p><h1 className="mt-1 font-display text-3xl font-bold">Me</h1></header>
    <section className="no-scrollbar mt-4 flex-1 space-y-4 overflow-y-auto pb-5">
      <div className="clay flex items-center gap-3 rounded-[26px] p-4"><div className="grid h-14 w-14 place-items-center rounded-[20px] bg-blush text-2xl">🙂</div><div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{state.session?.name || "Cookie guest"}</h2><p className="text-xs text-choc-soft">Your conversations live on this device.</p></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{PLANS[state.plan].name}</span></div>
      <div className="clay rounded-[26px] p-4"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Your plan</h2><p className="mt-1 text-xs text-choc-soft">A little room for more conversation.</p></div><Cookie size={60} mood="happy" bites={2}/></div><div className="mt-2 flex items-center justify-center gap-4"><CreditRing icon="💬" label={state.plan === "max" ? "fair use" : `${textsLeft(state)} left`} value={textsLeft(state) / Math.max(textsLimit(state), 1)}/><CreditRing icon="📞" label={`${Math.floor(callSecondsLeft(state) / 60)} min`} value={callSecondsLeft(state) / Math.max(callRingCapacity(state), 1)}/></div><Button full className="mt-3" onClick={() => nav.openSheet({ name: "paywall" })}><Sparkles size={16}/>Explore plans</Button></div>
      <button type="button" onClick={() => nav.openSheet({ name: "memory" })} className="clay flex min-h-16 w-full items-center gap-3 rounded-[22px] p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-lavender/45"><Brain size={20}/></span><span className="flex-1"><strong className="block font-display">Memory</strong><small className="text-choc-soft">See or clear what companions remember.</small></span><span aria-hidden="true">›</span></button>
      <div className="clay rounded-[24px] p-4"><h2 className="font-display text-lg font-bold">Settings</h2><div className="mt-2 divide-y divide-choc/5">{OPTIONS.map((option) => <label key={option.key} className="flex min-h-[62px] items-center gap-3 py-2"><span className="min-w-0 flex-1"><strong className="block text-sm">{option.label}</strong><small className="text-xs text-choc-soft">{option.helper}</small></span><input type="checkbox" checked={state.settings[option.key]} onChange={() => toggle(option.key)} className="h-5 w-5 accent-[#D9902B]"/></label>)}</div></div>
      <div className="clay rounded-[24px] p-4"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-ok"/><h2 className="font-display text-lg font-bold">Safety & support</h2></div><p className="mt-2 text-sm leading-relaxed text-choc-soft">Cookie is an AI companion, not a person or professional service. You can report a character or find real-world support.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="clay" size="sm" onClick={() => nav.openSheet({ name: "safety" })}><ShieldAlert size={15}/>Crisis resources</Button><Button variant="clay" size="sm" onClick={() => nav.openSheet({ name: "report" })}>Report a character</Button></div></div>
      <button type="button" onClick={() => nav.openSheet({ name: "deleteData" })} className="flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-danger/10 px-4 text-left font-bold text-danger"><Trash2 size={18}/>Delete all my data</button>
      <div className="pb-3 text-center text-xs leading-relaxed text-choc-soft/75"><p className="font-display text-sm font-bold text-choc">Cookie · version 1.0</p><p className="mt-1">Your AI companions are fictional characters created for conversation.</p></div>
    </section>
  </main>;
}
