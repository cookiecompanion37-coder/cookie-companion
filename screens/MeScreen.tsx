"use client";

import { useEffect } from "react";
import { Brain, ChevronRight, Crown, MessageCircle, Palette, Pencil, Phone, ShieldAlert, ShieldCheck, Sparkles, Sparkle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Cookie, CookieMark } from "@/components/ui/Cookie";
import { CreditRing } from "@/components/ui/CreditRing";
import { UserAvatar } from "@/components/ui/Avatar";
import { WScreen } from "@/components/ui/WallpaperBg";
import { WallpaperPicker } from "@/components/profile/WallpaperPicker";
import { PLANS } from "@/lib/constants";
import { callRingCapacity, callSecondsLeft, textsLeft, textsLimit } from "@/lib/credits";
import { useNav } from "@/lib/nav";
import { useAppState, setState } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import { wallpaper } from "@/lib/theme";
import { cn, formatTime } from "@/lib/utils";

const OPTIONS = [
  { key: "haptics", label: "Haptics", helper: "Little taps for buttons and reactions." },
  { key: "sounds", label: "Sounds", helper: "Soft pops and tiny call rings." },
  { key: "captions", label: "Call captions", helper: "Keep spoken words visible during calls." },
  { key: "reduceMotion", label: "Reduce motion", helper: "Calmer transitions and a still background." },
] as const;

function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle(): void }): React.JSX.Element {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} className={cn("relative h-[30px] w-[50px] shrink-0 rounded-full border transition-colors", on ? "border-transparent brand-gradient" : "border-white/70 bg-[#d8c1c9]/70")}>
      <motion.span layout transition={{ type: "spring", stiffness: 520, damping: 34 }} className={cn("absolute top-[3px] h-6 w-6 rounded-full bg-white shadow", on ? "left-[23px]" : "left-[3px]")} />
    </button>
  );
}

export function MeScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  useEffect(() => {
    sfx.setEnabled(state.settings.sounds);
    document.documentElement.dataset.reduce = state.settings.reduceMotion ? "1" : "0";
  }, [state.settings.sounds, state.settings.reduceMotion]);
  const toggle = (key: typeof OPTIONS[number]["key"]) => setState((current) => ({ ...current, settings: { ...current.settings, [key]: !current.settings[key] } }));

  const chatCount = Object.values(state.chats).reduce((sum, chat) => sum + chat.messages.filter((message) => message.role === "user").length, 0);
  const memoryCount = Object.values(state.memory).reduce((sum, items) => sum + items.length, 0);
  const talkSeconds = state.calls.reduce((sum, call) => sum + call.durationSec, 0);
  const activeWallpaper = wallpaper(state.wallpaper);

  return (
    <WScreen id={state.wallpaper}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between px-5 pt-[max(22px,env(safe-area-inset-top))]">
          <h1 className="font-display text-[27px] font-semibold text-[#34101d]">Me</h1>
          <button type="button" onClick={() => nav.openSheet({ name: "editProfile" })} aria-label="Edit profile" className="press grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#8a4258]"><Pencil size={16} /></button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-[104px] pt-4">
          <section className="relative overflow-hidden rounded-[28px] p-4 shadow-[0_24px_48px_-30px_rgba(160,20,70,.65)]" style={{ background: `linear-gradient(150deg, ${activeWallpaper.swatch[0]}, ${activeWallpaper.swatch[1]} 55%, ${activeWallpaper.swatch[2]})` }}>
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
            <div className="relative flex items-center gap-3.5">
              <UserAvatar name={state.session?.name || "Cookie guest"} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-[23px] font-semibold text-[#34101d]">{state.session?.name || "Cookie guest"}</h2>
                <p className="truncate text-[11px] font-medium text-[#5f2f41]/75">{state.session?.email || "Local guest · this device only"}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]"><Sparkles size={8} />{state.session?.vibe || "Cozy"} soul</span>
              </div>
              <Cookie size={58} mood="blush" bites={2} />
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {[{ value: chatCount, label: "messages" }, { value: state.customCharacters.length + Object.keys(state.chats).length, label: "companions" }, { value: formatTime(talkSeconds), label: "on calls" }].map((stat) => (
                <div key={stat.label} className="rounded-[16px] bg-white/45 px-2 py-2 text-center backdrop-blur-sm">
                  <strong className="block font-display text-[17px] font-semibold leading-none text-[#34101d]">{stat.value}</strong>
                  <small className="mt-1 block text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[#6d3a4b]/80">{stat.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="card mt-3 rounded-[24px] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#ffe3ec] text-[#c60f4d]"><Crown size={15} /></span>
                <div>
                  <h2 className="font-display text-[15px] font-semibold leading-tight text-[#34101d]">{PLANS[state.plan].name}</h2>
                  <p className="text-[10px] text-[#8a596b]">Your plan & little extras</p>
                </div>
              </div>
              <Button size="sm" onClick={() => nav.openSheet({ name: "paywall" })}>Plans</Button>
            </div>
            <div className="mt-3 flex items-center justify-around">
              <CreditRing icon={<MessageCircle size={17} strokeWidth={2.4} />} label={state.plan === "max" ? "fair use" : `${textsLeft(state)} left`} value={textsLeft(state) / Math.max(textsLimit(state), 1)} />
              <span className="h-8 w-px bg-[#e9c6d2]" />
              <CreditRing icon={<Phone size={17} strokeWidth={2.4} />} label={`${Math.floor(callSecondsLeft(state) / 60)} min`} value={callSecondsLeft(state) / Math.max(callRingCapacity(state), 1)} />
              <span className="h-8 w-px bg-[#e9c6d2]" />
              <CreditRing icon={<Sparkle size={17} strokeWidth={2.4} />} label={`${memoryCount} facts`} value={Math.min(1, memoryCount / 12)} />
            </div>
          </section>

          <section className="card mt-3 rounded-[24px] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#efe4ff] text-[#7b4bd8]"><Palette size={15} /></span>
              <div>
                <h2 className="font-display text-[15px] font-semibold leading-tight text-[#34101d]">Wallpaper</h2>
                <p className="text-[10px] text-[#8a596b]">Set the mood for every screen</p>
              </div>
            </div>
            <WallpaperPicker value={state.wallpaper} onPick={(id) => setState((current) => ({ ...current, wallpaper: id }))} />
          </section>

          <button type="button" onClick={() => nav.openSheet({ name: "memory" })} className="card press mt-3 flex min-h-[64px] w-full items-center gap-3 rounded-[24px] p-3.5 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#efe4ff] text-[#7b4bd8]"><Brain size={18} /></span>
            <span className="flex-1"><strong className="block font-display text-[14px] font-semibold text-[#34101d]">Memory</strong><small className="text-[10.5px] text-[#8a596b]">See or clear what companions remember.</small></span>
            <ChevronRight size={17} className="text-[#a97c8b]" />
          </button>

          <section className="card mt-3 rounded-[24px] p-4">
            <h2 className="font-display text-[15px] font-semibold text-[#34101d]">Settings</h2>
            <div className="mt-2 divide-y divide-[#e9c6d2]/50">
              {OPTIONS.map((option) => (
                <div key={option.key} className="flex min-h-[58px] items-center gap-3 py-2">
                  <span className="min-w-0 flex-1"><strong className="block text-[12.5px] font-semibold text-[#34101d]">{option.label}</strong><small className="block text-[10px] leading-snug text-[#8a596b]">{option.helper}</small></span>
                  <Toggle on={state.settings[option.key]} label={option.label} onToggle={() => toggle(option.key)} />
                </div>
              ))}
            </div>
          </section>

          <section className="card mt-3 rounded-[24px] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#45b98a]" />
              <h2 className="font-display text-[15px] font-semibold text-[#34101d]">Safety & support</h2>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#8a596b]">Cookie is an AI companion, not a person or a professional service. You can report a character, find real-world support, or wipe your data.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="soft" size="sm" onClick={() => nav.openSheet({ name: "safety" })}><ShieldAlert size={14} />Crisis resources</Button>
              <Button variant="soft" size="sm" onClick={() => nav.openSheet({ name: "report" })}>Report a character</Button>
            </div>
          </section>

          <button type="button" onClick={() => nav.openSheet({ name: "deleteData" })} className="press mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#ffe3e8] text-[12px] font-bold text-[#e5395c]">
            <Trash2 size={15} /> Delete all my data
          </button>

          <div className="mt-6 flex flex-col items-center pb-2 text-center">
            <CookieMark size={42} />
            <p className="mt-2 font-display text-[12px] font-semibold text-[#5c2a3b]">Cookie · version 2.0</p>
            <p className="mt-1 max-w-[250px] text-[9.5px] leading-relaxed text-[#966377]">Companions are fictional AI characters made for conversation. Photos are AI-generated.</p>
          </div>
        </div>
      </main>
    </WScreen>
  );
}
