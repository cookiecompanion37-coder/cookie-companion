"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Brain, Heart, Image as ImageIcon, MoreHorizontal, Palette, Phone, ShieldAlert, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Bubble } from "@/components/chat/Bubble";
import { Composer } from "@/components/chat/Composer";
import { ReactionTray } from "@/components/chat/ReactionTray";
import { TypingChips } from "@/components/chat/TypingChips";
import { Button } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { BOND_THRESHOLDS } from "@/lib/constants";
import { textsLeft } from "@/lib/credits";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { fx } from "@/components/effects/Particles";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/components/ui/Toast";
import type { Msg, Reaction } from "@/lib/types";

export function ChatScreen({ characterId }: { characterId: string }): React.JSX.Element {
  const state = useAppState();
  const engine = useEngine();
  const nav = useNav();
  const { toast } = useToast();
  const character = findCharacter(state, characterId);
  const chat = state.chats[characterId];
  const messages = chat?.messages ?? [];
  const bottom = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [reaction, setReaction] = useState<{ msgId: string; anchor: DOMRect } | null>(null);
  const [labels, setLabels] = useState<Record<string, { day: string; time: string }>>({});
  const [photoView, setPhotoView] = useState<string | null>(null);
  const [clock, setClock] = useState(0);

  const openRef = useRef(engine.openChat); openRef.current = engine.openChat;
  const startRef = useRef(engine.startChat); startRef.current = engine.startChat;
  const bond = chat?.sent ?? 0;
  const hearts = Math.max(1, BOND_THRESHOLDS.reduce((level, threshold, index) => bond >= threshold ? index + 1 : level, 1));
  const busyAt = engine.busyUntil[characterId];
  const remaining = busyAt && clock ? Math.max(0, Math.ceil((busyAt - clock) / 1000)) : 0;
  const noCredits = textsLeft(state) <= 0;
  const wall = state.characterWallpapers[characterId] ?? character?.wallpaper ?? state.wallpaper;

  useEffect(() => {
    if (!state.chats[characterId]) startRef.current(characterId);
    openRef.current(characterId);
    return () => openRef.current("");
    // Only re-run for a different character — `state.chats` changes on every message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    setClock(Date.now());
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const next: Record<string, { day: string; time: string }> = {};
    for (const message of messages) {
      const date = new Date(message.ts);
      next[message.id] = {
        day: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date),
        time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date),
      };
    }
    setLabels(next);
  }, [messages]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: state.settings.reduceMotion ? "auto" : "smooth", block: "end" });
  }, [messages.length, messages.at(-1)?.image?.status, engine.typing[characterId], state.settings.reduceMotion]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: "end" }));
    return () => window.cancelAnimationFrame(frame);
  }, [characterId]);

  const grouped = useMemo(() => messages.map((message, index) => {
    const next = messages[index + 1];
    const tail = !next || next.role !== message.role || next.ts - message.ts > 4 * 60_000;
    const newDay = index === 0 || labels[messages[index - 1]?.id ?? ""]?.day !== labels[message.id]?.day;
    return { message, tail, newDay };
  }), [messages, labels]);

  const longPress = (message: Msg, rect: DOMRect) => {
    haptic("react");
    const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
    const left = shell ? rect.left - shell.left : rect.left;
    const top = shell ? rect.top - shell.top : rect.top;
    setReaction({ msgId: message.id, anchor: new DOMRect(left, top, rect.width, rect.height) });
  };
  const react = (id: string, emoji: Reaction | null) => {
    engine.react(characterId, id, emoji);
    const rect = reaction?.anchor;
    if (emoji && rect) fx.burst(rect.left + rect.width / 2, rect.top, emoji);
    setReaction(null);
  };
  const call = () => {
    if (remaining > 0) { toast(`They're free in ${Math.ceil(remaining / 60)} min`, "📞"); return; }
    engine.requestCall(characterId);
    toast(`Asking ${character?.name ?? "them"} to call…`, "✨");
  };

  if (!character) {
    return <WScreen><div className="relative z-10 grid h-full place-items-center p-6 text-center"><div><p className="font-display text-lg font-semibold">This companion isn’t here anymore.</p><Button className="mt-4" onClick={() => nav.pop()}>Go back</Button></div></div></WScreen>;
  }

  return (
    <WScreen id={wall}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/50 bg-white/25 px-2.5 pb-2.5 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
          <button type="button" onClick={() => nav.pop()} aria-label="Back to chats" className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/50 text-[#5c2a3b]"><ArrowLeft size={19} /></button>
          <button type="button" onClick={() => nav.openSheet({ name: "character", characterId })} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar character={character} size={42} online={!engine.typing[characterId]} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <strong className="truncate font-display text-[16px] font-semibold text-[#34101d]">{character.name}</strong>
                <span className="flex shrink-0 items-center gap-0.5 text-[#f5286e]" aria-label={`${hearts} bond hearts`}>{Array.from({ length: Math.min(hearts, 4) }, (_, index) => <Heart key={index} size={8} fill="currentColor" strokeWidth={0} />)}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#7d4a5d]">
                {engine.typing[characterId] ? <><span className="h-1.5 w-1.5 rounded-full bg-[#f5286e]" />typing…</> : <><span className="h-1.5 w-1.5 rounded-full bg-[#45b98a]" />{remaining > 0 ? "away for a moment" : "here with you"}</>}
                <span className="rounded-full bg-white/55 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide">AI</span>
              </span>
            </span>
          </button>
          <button type="button" onClick={call} aria-label="Start a voice call" className={`press grid h-10 w-10 shrink-0 place-items-center rounded-full ${remaining > 0 ? "bg-white/50 text-[#a97c8b]" : "brand-gradient text-white shadow-[0_10px_20px_-10px_rgba(214,18,83,.9)]"}`}><Phone size={17} /></button>
          <button type="button" onClick={() => setMenu(!menu)} aria-label="Chat options" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/50 text-[#5c2a3b]"><MoreHorizontal size={18} /></button>
          <AnimatePresence>
            {menu && (
              <>
                <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="glass absolute right-2.5 top-[calc(100%+6px)] z-30 w-[214px] rounded-[20px] p-1.5">
                  {[
                    { icon: Sparkles, label: "View profile", run: () => nav.openSheet({ name: "character", characterId }) },
                    { icon: Palette, label: "Chat wallpaper", run: () => nav.openSheet({ name: "wallpaper", characterId }) },
                    { icon: Brain, label: "Memory", run: () => nav.openSheet({ name: "memory", characterId }) },
                    { icon: ShieldAlert, label: "Report character", run: () => nav.openSheet({ name: "report", characterId }), danger: true },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} type="button" onClick={() => { setMenu(false); item.run(); }} className={`flex min-h-10 w-full items-center gap-2.5 rounded-[13px] px-3 text-left text-[12px] font-semibold ${item.danger ? "text-[#e5395c]" : "text-[#4c1d2d]"}`}>
                        <Icon size={15} />{item.label}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        <section aria-label={`Conversation with ${character.name}`} className="no-scrollbar relative z-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
          <div className="mx-auto mb-2 flex max-w-[290px] items-center justify-center gap-1.5 rounded-full border border-white/60 bg-white/45 px-3 py-1.5 text-center text-[9.5px] font-medium leading-relaxed text-[#7d4a5d] backdrop-blur-md">
            <Sparkles size={10} className="shrink-0" /> {character.name} is an AI companion. Photos are generated, not real.
          </div>
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-[280px] text-center">
              <Avatar character={character} size={92} className="mx-auto" />
              <h2 className="mt-4 font-display text-[21px] font-semibold text-[#34101d]">Say hi to {character.name}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#7d4a5d]">{character.tagline}</p>
            </div>
          )}
          {grouped.map(({ message, tail, newDay }) => (
            <div key={message.id}>
              {newDay && labels[message.id] && <p className="my-3 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#966377]/80">{labels[message.id]?.day}</p>}
              <div className={message.image?.status === "ready" && message.image.url ? "cursor-zoom-in" : undefined} onClick={() => { if (message.image?.status === "ready" && message.image.url) setPhotoView(message.image.url); }}>
                <Bubble msg={message} character={character} tail={tail} onReact={react} onLongPress={longPress} />
              </div>
              {tail && !message.image && labels[message.id] && <p className={`mt-0.5 text-[8.5px] font-medium text-[#966377]/70 ${message.role === "user" ? "pr-1 text-right" : "pl-1"}`}>{labels[message.id]?.time}</p>}
            </div>
          ))}
          {engine.typing[characterId] && <TypingChips accent={character.accent} />}
          <div ref={bottom} className="h-1" />
        </section>

        {reaction && <ReactionTray anchor={reaction.anchor} mine={chat?.messages.find((message) => message.id === reaction.msgId)?.reactions.find((item) => item.by === "user")?.emoji} onPick={(emoji) => react(reaction.msgId, emoji)} onClose={() => setReaction(null)} />}

        <Composer
          disabled={noCredits}
          outOfCredits={noCredits}
          quickReplies={engine.quickReplies[characterId] ?? []}
          onSend={(text) => engine.send(characterId, text)}
          onVoiceNote={(blob, duration) => engine.sendVoiceNote(characterId, blob, duration)}
          onPhoto={(file) => engine.sendPhoto(characterId, file, "")}
          onUpgrade={() => nav.openSheet({ name: "paywall" })}
        />

        <AnimatePresence>
          {photoView && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col bg-[#1c0710]/92 backdrop-blur-md" onClick={() => setPhotoView(null)}>
              <div className="flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))] pb-3 text-white">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70"><ImageIcon size={12} /> a little moment</span>
                <button type="button" aria-label="Close photo" className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><X size={19} /></button>
              </div>
              <div className="flex flex-1 items-center justify-center px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoView} alt="Generated photo" className="max-h-full w-auto max-w-full rounded-[26px] object-contain shadow-2xl" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </WScreen>
  );
}
