"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pin, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CreditRing } from "@/components/ui/CreditRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { callRingCapacity, callSecondsLeft, textsLeft, textsLimit } from "@/lib/credits";
import { SEED_CHARACTERS } from "@/lib/seed";
import { useAppState, useHydrated, setState } from "@/lib/store";
import { useNav } from "@/lib/nav";
import { timeAgo } from "@/lib/utils";

export function HomeScreen(): React.JSX.Element {
  const state = useAppState(); const hydrated = useHydrated(); const nav = useNav(); const engine = useEngine();
  const [greeting, setGreeting] = useState("Hello"); const [openRow, setOpenRow] = useState<string | null>(null);
  useEffect(() => { const hour = new Date().getHours(); setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"); }, []);
  const rows = useMemo(() => Object.values(state.chats).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs), [state.chats]);
  const openCharacter = (id: string) => { engine.startChat(id); nav.push({ name: "chat", characterId: id }); };
  const removeChat = (id: string) => setState((current) => { const chats = { ...current.chats }; delete chats[id]; return { ...current, chats }; });
  const togglePin = (id: string) => setState((current) => { const chat = current.chats[id]; return chat ? { ...current, chats: { ...current.chats, [id]: { ...chat, pinned: !chat.pinned } } } : current; });
  const unread = rows.reduce((sum, chat) => sum + chat.unread, 0);
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[110px] pt-[max(26px,env(safe-area-inset-top))]">
    <div className="mesh-bg"/><div className="paper-grain"/>
    <header className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-choc-soft">your cozy corner</p><h1 className="mt-1 font-display text-3xl font-bold">{greeting}{state.session?.name ? `, ${state.session.name}` : ""} ✨</h1></div><div className="flex items-center gap-1"><CreditRing icon="💬" label={state.plan === "max" ? "fair use" : `${textsLeft(state)}`} value={textsLeft(state) / Math.max(1, textsLimit(state))} onClick={() => nav.openSheet({ name: "paywall" })}/><CreditRing icon="📞" label={`${Math.floor(callSecondsLeft(state) / 60)}m`} value={callSecondsLeft(state) / Math.max(1, callRingCapacity(state))} onClick={() => nav.openSheet({ name: "paywall" })}/></div></header>
    <section className="mt-4"><div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Online now</h2><button type="button" onClick={() => nav.setTab("discover")} className="min-h-11 text-xs font-bold text-choc-soft">Find someone</button></div><div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">{SEED_CHARACTERS.slice(0, 6).map((character) => <button key={character.id} type="button" onClick={() => openCharacter(character.id)} className="flex min-w-[62px] flex-col items-center gap-1.5"><Avatar character={character} online size={54}/><span className="max-w-[66px] truncate text-[11px] font-bold">{character.name}</span></button>)}</div></section>
    <section className="mt-3 flex min-h-0 flex-1 flex-col"><div className="mb-2 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Your chats</h2><span className="text-xs text-choc-soft">{unread ? `${unread} new` : "Just for you"}</span></div>
      {rows.length === 0 ? <div className="no-scrollbar flex-1 overflow-y-auto"><EmptyState mood="crumbled" title="No crumbs here yet" body="Find a companion to start a little conversation." action={<Button onClick={() => nav.setTab("discover")}>Find someone</Button>}/></div> : <div className="no-scrollbar -mx-2 overflow-y-auto px-2 pb-4">{rows.map((chat) => {
        const character = findCharacter(state, chat.characterId); if (!character) return null;
        const last = chat.messages.at(-1); const preview = engine.typing[chat.characterId] ? "typing…" : last?.kind === "voice" ? "Voice note" : last?.text ?? "Say hello";
        const open = openRow === chat.characterId;
        return <div key={chat.characterId} className="relative mb-2 overflow-hidden rounded-[24px]">
          <div className="absolute inset-y-0 right-0 flex"><button type="button" onClick={() => { togglePin(chat.characterId); setOpenRow(null); }} aria-label={chat.pinned ? "Unpin chat" : "Pin chat"} className="flex w-14 items-center justify-center bg-biscuit/20 text-choc"><Pin size={18}/></button><button type="button" onClick={() => removeChat(chat.characterId)} aria-label="Delete chat" className="flex w-14 items-center justify-center bg-danger/15 text-danger"><Trash2 size={18}/></button></div>
          <motion.div drag="x" dragConstraints={{ left: -112, right: 0 }} dragElastic={.03} animate={{ x: open ? -112 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} onDragEnd={(_, info) => setOpenRow(info.offset.x < -42 ? chat.characterId : null)} onClick={() => openCharacter(chat.characterId)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") openCharacter(chat.characterId); }} className="clay relative flex min-h-[82px] cursor-pointer items-center gap-3 rounded-[24px] p-3">
            <Avatar character={character} size={56} ring/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-display text-lg font-bold">{character.name}</h3>{chat.pinned && <Pin size={12} className="text-biscuit-deep"/>}</div><p className="truncate text-sm text-choc-soft">{preview}</p></div><div className="flex h-full flex-col items-end justify-center gap-2"><span className="text-[10px] text-choc-soft/70">{hydrated && chat.lastTs ? timeAgo(chat.lastTs) : ""}</span>{chat.unread > 0 && <span className="rounded-full bg-chip px-2.5 py-1 text-[10px] font-bold text-cream">{chat.unread}</span>}</div>
          </motion.div>
        </div>;
      })}</div>}
    </section>
  </main>;
}
