"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MoreHorizontal, Phone, ShieldAlert, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Bubble } from "@/components/chat/Bubble";
import { Composer } from "@/components/chat/Composer";
import { ReactionTray } from "@/components/chat/ReactionTray";
import { TypingChips } from "@/components/chat/TypingChips";
import { Button } from "@/components/ui/Button";
import { BOND_THRESHOLDS } from "@/lib/constants";
import { textsLeft } from "@/lib/credits";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { fx } from "@/components/effects/Particles";
import { haptic } from "@/lib/haptics";
import type { Msg, Reaction } from "@/lib/types";

export function ChatScreen({ characterId }: { characterId: string }): React.JSX.Element {
  const state = useAppState(); const engine = useEngine(); const nav = useNav();
  const character = findCharacter(state, characterId); const chat = state.chats[characterId];
  const messages = chat?.messages ?? []; const bottom = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false); const [reaction, setReaction] = useState<{ msgId: string; anchor: DOMRect } | null>(null);
  const [labels, setLabels] = useState<Record<string, { day: string; time: string }>>({}); const [clock, setClock] = useState(0);
  const openRef = useRef(engine.openChat); openRef.current = engine.openChat;
  const startRef = useRef(engine.startChat); startRef.current = engine.startChat;
  const bond = chat?.sent ?? 0;
  const hearts = Math.max(1, BOND_THRESHOLDS.reduce((level, threshold, index) => bond >= threshold ? index + 1 : level, 1));
  const busyAt = engine.busyUntil[characterId];
  const remaining = busyAt && clock ? Math.max(0, Math.ceil((busyAt - clock) / 1000)) : 0;
  const noCredits = textsLeft(state) <= 0;

  useEffect(() => { startRef.current(characterId); openRef.current(characterId); return () => openRef.current(""); }, [characterId]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    setClock(Date.now());
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const next: Record<string, { day: string; time: string }> = {};
    for (const message of messages) {
      const date = new Date(message.ts);
      next[message.id] = { day: new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date), time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) };
    }
    setLabels(next);
  }, [messages]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: state.settings.reduceMotion ? "auto" : "smooth", block: "end" }); }, [messages.length, engine.typing[characterId], state.settings.reduceMotion]);
  const grouped = useMemo(() => messages.map((message, index) => {
    const next = messages[index + 1];
    const tail = !next || next.role !== message.role || next.ts - message.ts > 4 * 60_000;
    const newDay = index === 0 || labels[messages[index - 1]?.id ?? ""]?.day !== labels[message.id]?.day;
    return { message, tail, newDay };
  }), [messages, labels]);
  const longPress = (message: Msg, rect: DOMRect) => {
    haptic("react");
    const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
    const left = shell ? rect.left - shell.left : rect.left; const top = shell ? rect.top - shell.top : rect.top;
    setReaction({ msgId: message.id, anchor: new DOMRect(left, top, rect.width, rect.height) });
  };
  const react = (id: string, emoji: Reaction | null) => {
    engine.react(characterId, id, emoji);
    const rect = reaction?.anchor;
    if (emoji && rect) fx.burst(rect.left + rect.width / 2, rect.top, emoji);
    setReaction(null);
  };
  const call = () => { engine.requestCall(characterId); };
  if (!character) return <div className="absolute inset-0 grid place-items-center p-6 text-center"><p>This companion isn&apos;t here anymore.</p><Button onClick={() => nav.pop()}>Go back</Button></div>;
  return <main className="absolute inset-0 flex flex-col overflow-hidden bg-cream/80">
    <div className="mesh-bg"/>
    <header className="safe-top relative z-10 flex shrink-0 items-center gap-2 border-b border-white/60 bg-cream/70 px-3 pb-2 backdrop-blur-lg">
      <button type="button" onClick={() => nav.pop()} aria-label="Back to chats" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><ArrowLeft size={21}/></button>
      <Avatar character={character} size={46} ring busy={remaining > 0}/>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-1"><h1 className="truncate font-display text-lg font-bold">{character.name}</h1><span className="text-xs" aria-label={`${hearts} bond hearts`}>{"❤️".repeat(hearts)}</span></div><div className="flex items-center gap-1.5"><span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold text-choc-soft">AI companion</span><span className="truncate text-[10px] text-choc-soft">{engine.typing[characterId] ? "typing…" : remaining > 0 ? `busy · back in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "here with you"}</span></div></div>
      <button type="button" aria-label="Start a voice call" onClick={call} className={`flex h-11 w-11 items-center justify-center rounded-full ${remaining > 0 ? "bg-white/60 text-choc-soft" : "bg-ok/20 text-ok"}`}><Phone size={19}/></button>
      <button type="button" aria-label="More chat options" onClick={() => setMenu(!menu)} className="flex h-11 w-11 items-center justify-center rounded-full"><MoreHorizontal size={20}/></button>
      {menu && <div className="glass absolute right-3 top-[74px] z-30 w-48 rounded-[20px] p-2 shadow-lg"><button type="button" onClick={() => { setMenu(false); nav.openSheet({ name: "memory" }); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold"><Sparkles size={15}/>Memory</button><button type="button" onClick={() => { setMenu(false); nav.openSheet({ name: "report", characterId }); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-danger"><ShieldAlert size={15}/>Report character</button><span className="sr-only">{state.credits.bonusCallSeconds} bonus call seconds</span></div>}
    </header>
    <section aria-label={`Conversation with ${character.name}`} className="no-scrollbar relative z-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {chat && <div className="mx-auto mb-3 max-w-[270px] rounded-full border border-white/70 bg-white/70 px-4 py-2 text-center text-[10px] leading-relaxed text-choc-soft">Cookie companions are AI. Be kind, be you.</div>}
      {grouped.map(({ message, tail, newDay }) => <div key={message.id}>
        {newDay && labels[message.id] && <p className="my-3 text-center text-[10px] font-bold text-choc-soft/65">{labels[message.id]?.day}</p>}
        <Bubble msg={message} character={character} tail={tail} onReact={react} onLongPress={longPress}/>
        {tail && labels[message.id] && <p className={`-mt-2 text-[9px] text-choc-soft/50 ${message.role === "user" ? "text-right pr-1" : "pl-1"}`}>{labels[message.id]?.time}</p>}
      </div>)}
      {engine.typing[characterId] && <TypingChips accent={character.accent}/>}
      <div ref={bottom}/>
    </section>
    {reaction && <ReactionTray anchor={reaction.anchor} mine={chat?.messages.find((message) => message.id === reaction.msgId)?.reactions.find((item) => item.by === "user")?.emoji} onPick={(emoji) => react(reaction.msgId, emoji)} onClose={() => setReaction(null)}/>}
    <Composer disabled={noCredits} outOfCredits={noCredits} quickReplies={engine.quickReplies[characterId] ?? []} onSend={(text) => engine.send(characterId, text)} onVoiceNote={(durationSec) => engine.send(characterId, `[voice note, ${durationSec}s]`, { kind: "voice", durationSec })} onUpgrade={() => nav.openSheet({ name: "paywall" })}/>
  </main>;
}
