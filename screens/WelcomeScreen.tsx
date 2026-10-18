"use client";

import { ArrowRight, Lock, MessageCircle } from "lucide-react";
import { WScreen } from "@/components/ui/WallpaperBg";
import { SEED_CHARACTERS } from "@/lib/seed";
import { setState } from "@/lib/store";

export function WelcomeScreen(): React.JSX.Element {
  const begin = () => setState(s => ({ ...s, stage: "signin" }));
  return <WScreen><main className="welcome-layout flex h-full flex-col overflow-y-auto px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
    <header className="flex items-center justify-between"><span className="flex items-center gap-2"><img src="/brand/logo.png" alt="Cookie" className="h-9 w-9 rounded-xl object-cover"/><span className="text-[20px] font-extrabold tracking-[-.06em]">cookie<span className="ml-1 rounded border border-[#e5dce0] px-1.5 py-0.5 text-[9px] font-semibold tracking-normal text-[#91838b]">18+</span></span></span><button type="button" onClick={begin} className="min-h-11 text-[12px] font-semibold text-[#994767]">Sign in <ArrowRight size={13} className="ml-1 inline"/></button></header>
    <div className="welcome-body flex flex-1 flex-col justify-center py-8"><div className="mb-8 flex items-end justify-center gap-3">{SEED_CHARACTERS.slice(0,3).map((c,i) => <div key={c.id} className={`w-[28%] max-w-32 overflow-hidden rounded-[60px] ${i === 1 ? "mb-7 aspect-[3/4]" : "aspect-[3/4]"}`}><img src={c.photo} alt={c.name} className="h-full w-full object-cover object-[center_30%]"/></div>)}</div>
    <p className="eyebrow">A little closer, every day</p><h1 className="mt-3 max-w-sm text-[clamp(34px,9.5vw,48px)] font-bold leading-[1.08] tracking-[-.055em]">More than a chat.<br/><span className="text-[#a95173]">A connection.</span></h1><p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#857780]">For the big feelings, the small wins, and everything you just want to say. Meet an AI companion who remembers.</p>
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[11px] text-[#857780]"><span className="flex items-center gap-2"><MessageCircle size={14}/>Chat & voice</span><span className="flex items-center gap-2"><Lock size={13}/>A private space</span></div></div>
    <div className="shrink-0"><button type="button" onClick={begin} className="flex min-h-14 w-full items-center justify-between rounded-xl bg-[#a95173] px-5 text-[14px] font-semibold text-white">Find your connection <ArrowRight size={18}/></button><p className="mt-4 text-center text-[10px] leading-relaxed text-[#a2969d]">Made for adults. Companions are fictional AI characters.</p></div>
  </main></WScreen>;
}
