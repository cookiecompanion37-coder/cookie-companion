"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, MessageCircle, Phone, Pin, Plus, Sparkles, Trash2 } from "lucide-react";
import { Avatar, UserAvatar } from "@/components/ui/Avatar";
import { StoryRail } from "@/components/stories/StoryRail";
import { Button } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useAppState, useHydrated, setState } from "@/lib/store";
import { useNav } from "@/lib/nav";
import { SEED_CHARACTERS } from "@/lib/seed";
import { timeAgo } from "@/lib/utils";

export function HomeScreen(): React.JSX.Element {
  const state = useAppState();
  const hydrated = useHydrated();
  const nav = useNav();
  const engine = useEngine();
  const [greeting, setGreeting] = useState("Hello");
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const rows = useMemo(() => Object.values(state.chats).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs), [state.chats]);
  const openCharacter = (id: string) => { engine.startChat(id); nav.push({ name: "chat", characterId: id }); };
  const removeChat = (id: string) => setState((current) => { const chats = { ...current.chats }; delete chats[id]; return { ...current, chats }; });
  const togglePin = (id: string) => setState((current) => { const chat = current.chats[id]; return chat ? { ...current, chats: { ...current.chats, [id]: { ...chat, pinned: !chat.pinned } } } : current; });

  const spotlight = rows.length ? findCharacter(state, rows[0]!.characterId) : SEED_CHARACTERS[0];
  const spotlightChat = spotlight ? state.chats[spotlight.id] : undefined;
  const spotlightPreview = spotlightChat?.messages.at(-1)?.text;
  const online = [...state.customCharacters, ...SEED_CHARACTERS].slice(0, 8);

  return (
    <WScreen id={state.wallpaper}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-[max(22px,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a33b5e]">{greeting}</p>
            <h1 className="mt-0.5 truncate font-display text-[28px] font-semibold leading-tight text-[#34101d]">
              {state.session?.name || "friend"} <Sparkles size={19} className="mb-1 inline-block animate-[float_4s_ease-in-out_infinite] text-[#f5286e]" strokeWidth={2.2} />
            </h1>
          </div>
          <button type="button" onClick={() => nav.setTab("me")} className="press shrink-0 rounded-[18px]" aria-label="Your profile">
            <UserAvatar name={state.session?.name || "Cookie guest"} size={44} />
          </button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto pb-[104px]">
          <StoryRail className="pt-4" />

          {spotlight && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-4">
              <button type="button" onClick={() => openCharacter(spotlight.id)} className="relative block w-full overflow-hidden rounded-[28px] text-left shadow-[0_26px_48px_-28px_rgba(160,20,70,.7)]">
                <div className="relative h-[186px] w-full">
                  {spotlight.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={spotlight.photo} alt={spotlight.name} className="h-full w-full object-cover object-[center_28%]" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[linear-gradient(140deg,#ffd9e5,#ffeedf_60%,#efe2ff)] text-6xl">{spotlight.emoji}</div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,5,15,.02)_20%,rgba(30,5,15,.82)_100%)]" />
                  <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7fe3b4]" /> online now
                  </span>
                  <span className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md"><Sparkles size={16} /></span>
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">continue with</p>
                    <h2 className="font-display text-[24px] font-semibold leading-tight">{spotlight.name}</h2>
                    <p className="mt-0.5 line-clamp-1 max-w-[250px] text-[11.5px] text-white/80">{spotlightPreview ?? spotlight.greeting}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11.5px] font-bold text-[#c60f4d] shadow-lg">
                      Say hello <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </button>
            </motion.section>
          )}

          <section className="mt-5 px-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-semibold text-[#34101d]">Your people</h2>
              <button type="button" onClick={() => nav.setTab("discover")} className="press flex items-center gap-0.5 text-[11px] font-bold text-[#a33b5e]">Discover <ChevronRight size={13} /></button>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              <button type="button" onClick={() => nav.push({ name: "create" })} className="flex w-[58px] shrink-0 flex-col items-center gap-1.5">
                <span className="grid h-[58px] w-[58px] place-items-center rounded-[20px] border border-dashed border-[#d68aa4] bg-white/45 text-[#c60f4d]"><Plus size={20} /></span>
                <span className="text-[10px] font-bold text-[#8a4258]">Create</span>
              </button>
              {online.map((character) => (
                <button key={character.id} type="button" onClick={() => openCharacter(character.id)} className="flex w-[58px] shrink-0 flex-col items-center gap-1.5">
                  <Avatar character={character} size={58} online={character.id === "mira" || character.id === "jules"} />
                  <span className="w-full truncate text-center text-[10px] font-bold text-[#5c2a3b]">{character.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5 px-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="font-display text-[19px] font-semibold text-[#34101d]">Chats</h2>
              {rows.length > 0 && <span className="text-[10.5px] font-semibold text-[#a33b5e]">{rows.length} conversation{rows.length === 1 ? "" : "s"}</span>}
            </div>

            {rows.length === 0 ? (
              <div className="card mt-1 flex items-center gap-3 rounded-[24px] p-4">
                <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[linear-gradient(150deg,#ffd9e5,#ffb4cb)] text-[#c60f4d]"><MessageCircle size={20} /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block font-display text-[14px] font-semibold text-[#34101d]">No chats yet</strong>
                  <p className="text-[11.5px] leading-snug text-[#8a596b]">Tap a companion above, or find a new one.</p>
                </div>
                <Button size="sm" onClick={() => nav.setTab("discover")}>Find</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((chat) => {
                  const character = findCharacter(state, chat.characterId);
                  if (!character) return null;
                  const last = chat.messages.at(-1);
                  const preview = engine.typing[chat.characterId] ? "typing…" : last?.image ? "sent a photo" : last?.kind === "voice" ? "sent a voice note" : last?.text ?? "Say hello";
                  const open = openRow === chat.characterId;
                  return (
                    <div key={chat.characterId} className="relative overflow-hidden rounded-[22px]">
                      <div className="absolute inset-y-0 right-0 flex">
                        <button type="button" onClick={() => { togglePin(chat.characterId); setOpenRow(null); }} aria-label={chat.pinned ? "Unpin chat" : "Pin chat"} className="flex w-14 items-center justify-center bg-[#f4e6ff] text-[#7b4bd8]"><Pin size={17} /></button>
                        <button type="button" onClick={() => removeChat(chat.characterId)} aria-label="Delete chat" className="flex w-14 items-center justify-center bg-[#ffe3e8] text-[#e5395c]"><Trash2 size={17} /></button>
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -112, right: 0 }}
                        dragElastic={0.03}
                        animate={{ x: open ? -112 : 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        onDragEnd={(_, info) => setOpenRow(info.offset.x < -44 ? chat.characterId : null)}
                        onClick={() => openCharacter(chat.characterId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => { if (event.key === "Enter") openCharacter(chat.characterId); }}
                        className="card relative flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[22px] p-2.5"
                      >
                        <Avatar character={character} size={54} online={!chat.unread} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate font-display text-[15px] font-semibold text-[#34101d]">{character.name}</h3>
                            {chat.pinned && <Pin size={10} className="text-[#c60f4d]" />}
                            <span className="rounded-full bg-[#ffe4ee] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#b02a56]">AI</span>
                          </div>
                          <p className={`mt-0.5 truncate text-[12px] ${chat.unread ? "font-semibold text-[#4c1d2d]" : "text-[#8a596b]"}`}>{preview}</p>
                        </div>
                        <div className="flex h-full flex-col items-end justify-center gap-1.5 pr-0.5">
                          <span className="text-[9.5px] font-semibold text-[#a97c8b]">{hydrated && chat.lastTs ? timeAgo(chat.lastTs) : ""}</span>
                          {chat.unread > 0 ? (
                            <span className="min-w-[20px] rounded-full brand-gradient px-1.5 py-0.5 text-center text-[9.5px] font-bold text-white">{chat.unread}</span>
                          ) : (
                            <button type="button" aria-label={`Call ${character.name}`} onClick={(event) => { event.stopPropagation(); engine.requestCall(character.id); openCharacter(character.id); }} className="grid h-7 w-7 place-items-center rounded-full bg-[#ffe4ee] text-[#c60f4d]"><Phone size={12} /></button>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </WScreen>
  );
}
