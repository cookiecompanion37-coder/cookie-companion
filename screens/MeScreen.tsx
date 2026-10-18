"use client";

import { useState } from "react";
import { Brain, ChevronRight, LogOut, Moon, Palette, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import { WScreen } from "@/components/ui/WallpaperBg";
import { WallpaperPicker } from "@/components/profile/WallpaperPicker";
import { Diary } from "@/components/profile/Diary";
import { useToast } from "@/components/ui/Toast";
import { useNav } from "@/lib/nav";
import { useAppState, setState, signOut } from "@/lib/store";
import { PLANS } from "@/lib/constants";
import { callSecondsLeft, textsLeft } from "@/lib/credits";

const preferences = [
  { key: "haptics", label: "Haptic feedback", description: "A little response to your touch." },
  { key: "sounds", label: "App sounds", description: "Soft alerts and call rings." },
  { key: "captions", label: "Call captions", description: "Keep the conversation visible." },
  { key: "reduceMotion", label: "Reduce motion", description: "Less movement, more stillness." },
] as const;

export function MeScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const { toast } = useToast();
  const [walls, setWalls] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const memories = Object.values(state.memory).reduce((sum, facts) => sum + facts.length, 0);

  async function leave() {
    setLeaving(true);
    try { await signOut(); nav.setTab("chats"); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not sign out."); }
    finally { setLeaving(false); }
  }

  return <WScreen id={state.wallpaper}>
    <main className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between px-5 pb-5 pt-[max(28px,env(safe-area-inset-top))]">
        <div><p className="eyebrow">Make room for yourself</p><h1 className="mt-1 text-[30px] font-bold tracking-[-.045em]">Your corner.</h1></div>
        <button type="button" onClick={() => nav.openSheet({ name: "editProfile" })} aria-label="Edit profile" className="icon-control"><Pencil size={17}/></button>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-28">
        <section className="flex items-center gap-4 border-b border-[#ebe5e7] pb-6">
          <UserAvatar name={state.session?.name || "You"} size={60}/>
          <div className="min-w-0"><h2 className="truncate text-[21px] font-bold tracking-tight">{state.session?.name || "You"}</h2><p className="mt-0.5 truncate text-[12px] text-[#91838b]">{state.session?.email}</p><p className="mt-2 text-[10px] font-semibold text-[#a95173]">{state.session?.vibe || "Cozy"} at heart</p></div>
        </section>
        <section className="grid grid-cols-3 border-b border-[#ebe5e7] py-5 text-center">
          {[{ value: Object.keys(state.chats).length, label: "Connections" }, { value: memories, label: "Memories" }, { value: state.calls.length, label: "Calls" }].map(stat => <div key={stat.label}><strong className="block text-[21px] font-bold">{stat.value}</strong><span className="mt-1 block text-[10px] text-[#91838b]">{stat.label}</span></div>)}
        </section>
        <Diary/>
        <button type="button" onClick={() => nav.openSheet({ name: "memory" })} className="flex min-h-16 w-full items-center gap-3 border-b border-[#ebe5e7] text-left"><Brain size={19} className="text-[#a95173]"/><span className="flex-1 text-[13px] font-semibold">What they remember<span className="mt-0.5 block text-[11px] font-normal text-[#91838b]">Your details. Always in your control.</span></span><ChevronRight size={16}/></button>
        <section className="mt-6">
          <h2 className="eyebrow">Just the way you like it</h2>
          <div className="mt-2 divide-y divide-[#ebe5e7]">{preferences.map(option => <div key={option.key} className="flex items-center justify-between gap-4 py-4">
            <div><h3 className="text-[13px] font-semibold">{option.label}</h3><p className="mt-1 text-[11px] text-[#91838b]">{option.description}</p></div>
            <button type="button" role="switch" aria-checked={state.settings[option.key]} aria-label={option.label} onClick={() => setState(s => ({ ...s, settings: { ...s.settings, [option.key]: !s.settings[option.key] } }))} className="flex min-h-11 w-12 shrink-0 items-center">
              <span className={`relative h-6 w-11 rounded-full transition-colors ${state.settings[option.key] ? "bg-[#a95173]" : "bg-[#e8e1e5]"}`}><span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${state.settings[option.key] ? "translate-x-5" : "translate-x-0"}`}/></span>
            </button>
          </div>)}</div>
        </section>
        <div className="flex items-center justify-between gap-4 border-b border-[#ebe5e7] py-4">
          <div className="flex items-center gap-3"><Moon size={18} className="text-[#a95173]"/><div><h3 className="text-[13px] font-semibold">Dark mode</h3><p className="mt-1 text-[11px] text-[#91838b]">A softer look for late nights.</p></div></div>
          <button type="button" role="switch" aria-checked={state.wallpaper === "midnight"} aria-label="Dark mode" onClick={() => setState(s => ({ ...s, wallpaper: s.wallpaper === "midnight" ? "sakura" : "midnight" }))} className="flex min-h-11 w-12 shrink-0 items-center">
            <span className={`relative h-6 w-11 rounded-full transition-colors ${state.wallpaper === "midnight" ? "bg-[#a95173]" : "bg-[#e8e1e5]"}`}><span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${state.wallpaper === "midnight" ? "translate-x-5" : "translate-x-0"}`}/></span>
          </button>
        </div>
        <button type="button" onClick={() => setWalls(!walls)} aria-expanded={walls} className="flex min-h-14 w-full items-center gap-3 border-b border-[#ebe5e7] text-[13px] font-semibold"><Palette size={18} className="text-[#a95173]"/><span className="flex-1 text-left">Conversation wallpaper</span><ChevronRight size={15}/></button>
        {walls && <div className="py-4"><WallpaperPicker value={state.wallpaper} onPick={id => setState(s => ({ ...s, wallpaper: id }))}/></div>}
        <section className="my-6 rounded-xl bg-[#f6f0f3] p-4"><div className="flex items-center justify-between"><h2 className="text-[13px] font-bold">{PLANS[state.plan].name}</h2><button type="button" onClick={() => nav.openSheet({ name: "paywall" })} className="text-[11px] font-semibold text-[#994767]">View plans</button></div><p className="mt-2 text-[11px] text-[#91838b]">{textsLeft(state)} messages · {Math.floor(callSecondsLeft(state)/60)} call minutes left</p></section>
        <button type="button" onClick={() => nav.openSheet({ name: "safety" })} className="flex min-h-12 w-full items-center gap-3 text-[12px] font-semibold"><ShieldCheck size={17} className="text-[#a95173]"/>Safety & support<ChevronRight size={14} className="ml-auto"/></button>
        <button type="button" disabled={leaving} onClick={() => void leave()} className="flex min-h-12 w-full items-center gap-3 text-[12px] font-semibold text-[#91838b]"><LogOut size={17}/>{leaving ? "Signing out…" : "Sign out"}</button>
        <button type="button" onClick={() => nav.openSheet({ name: "deleteData" })} className="flex min-h-12 w-full items-center gap-3 text-[12px] font-semibold text-[#b85f76]"><Trash2 size={17}/>Delete my saved data</button>
        <p className="mt-8 text-center text-[10px] leading-relaxed text-[#ad9da6]">Cookie · A little company, every day.<br/>Fictional AI companions. Real room for you.</p>
      </div>
    </main>
  </WScreen>;
}
