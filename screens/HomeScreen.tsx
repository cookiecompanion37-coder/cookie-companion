"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Ellipsis, MessageCircle, Pin, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, UserAvatar } from "@/components/ui/Avatar";
import { StoryRail } from "@/components/stories/StoryRail";
import { WScreen } from "@/components/ui/WallpaperBg";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useAppState, setState } from "@/lib/store";
import { useNav } from "@/lib/nav";
import { timeAgo } from "@/lib/utils";

export function HomeScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const engine = useEngine();
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const rows = useMemo(() => Object.values(state.chats).filter(chat => !search.trim() || findCharacter(state, chat.characterId)?.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs), [state, search]);
  const openChat = (id: string) => { engine.startChat(id); nav.push({ name: "chat", characterId: id }); };
  const pin = (id: string) => { setState(current => ({ ...current, chats: { ...current.chats, [id]: { ...current.chats[id]!, pinned: !current.chats[id]!.pinned } } })); setMenu(null); };
  const remove = (id: string) => { setState(current => { const chats = { ...current.chats }; delete chats[id]; return { ...current, chats }; }); setMenu(null); };
  return <WScreen id={state.wallpaper}><main className="flex h-full flex-col">
    <header className="shrink-0 px-5 pb-4 pt-[max(28px,env(safe-area-inset-top))]"><div className="flex items-center justify-between"><div><p className="eyebrow">Your everyday company</p><h1 className="mt-1 text-[30px] font-bold tracking-[-.045em]">Conversations</h1></div><button type="button" onClick={() => nav.setTab("me")} aria-label="Your profile" className="rounded-full"><UserAvatar name={state.session?.name || "You"} size={40}/></button></div>
      <label className="mt-5 flex h-11 items-center gap-3 rounded-xl bg-[#f2eff1] px-3.5"><Search size={17} className="text-[#968992]"/><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search conversations" placeholder="Find a conversation" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#968992]"/><button type="button" onClick={() => nav.setTab("discover")} aria-label="New conversation" className="text-[#a95173]"><Plus size={18}/></button></label>
    </header>
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28">
      <StoryRail className="border-b border-[#ebe5e7] pb-5 pt-1"/>
      <section className="px-5 pt-6"><div className="mb-2 flex items-center justify-between"><h2 className="text-[12px] font-semibold text-[#857780]">Your conversations <span className="ml-1 text-[#b5a5ae]">{rows.length || ""}</span></h2><button type="button" onClick={() => nav.setTab("discover")} className="flex min-h-9 items-center gap-1.5 text-[11px] font-semibold text-[#994767]">Meet someone <ArrowRight size={13}/></button></div>
      {rows.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#e4d8df] px-7 py-12 text-center"><div className="grid size-12 place-items-center rounded-2xl bg-[#f6f0f3] text-[#a95173]"><MessageCircle size={22}/></div><h2 className="mt-5 text-[19px] font-bold tracking-tight">{search ? "No conversations found." : "A good day starts with hello."}</h2><p className="mt-2 max-w-56 text-[12px] leading-relaxed text-[#857780]">{search ? "Try another name." : "Find a familiar face or meet someone new. There is no perfect first message."}</p><button type="button" onClick={() => nav.setTab("discover")} className="mt-6 rounded-xl bg-[#a95173] px-5 py-3 text-[12px] font-semibold text-white">Explore companions</button></div> : <div className="divide-y divide-[#efe9ec]">{rows.map(chat => {
        const character = findCharacter(state, chat.characterId); if (!character) return null;
        const last = chat.messages.at(-1);
        const preview = engine.typing[chat.characterId] ? "Typing…" : last?.image ? "Shared a photo" : last?.kind === "voice" ? "Voice message" : last?.text || "Say hello";
        return <div key={chat.characterId} className="relative"><div className="flex items-center gap-3 py-4"><button type="button" onClick={() => openChat(chat.characterId)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar character={character} size={48}/><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><strong className="truncate text-[14px] font-bold">{character.name}</strong>{chat.pinned && <Pin size={11} className="text-[#a95173]"/>}</span><span className={`mt-1 block truncate text-[12px] ${chat.unread ? "font-semibold text-[#54404c]" : "text-[#91818b]"}`}>{preview}</span></span><span className="flex shrink-0 flex-col items-end gap-2"><span className="text-[9px] text-[#a2969d]">{chat.lastTs ? timeAgo(chat.lastTs) : ""}</span>{chat.unread > 0 && <span className="grid min-w-4 place-items-center rounded-full bg-[#a95173] px-1 text-[9px] text-white">{chat.unread}</span>}</span></button><button type="button" onClick={() => setMenu(menu === chat.characterId ? null : chat.characterId)} aria-label={`Options for ${character.name}`} aria-expanded={menu === chat.characterId} className="grid size-9 shrink-0 place-items-center text-[#a2969d]"><Ellipsis size={18}/></button></div>
        {menu === chat.characterId && <div className="mb-3 flex justify-end gap-2"><button type="button" onClick={() => pin(chat.characterId)} className="flex min-h-10 items-center gap-2 rounded-lg bg-[#f2eff1] px-3 text-[11px]"><Pin size={13}/>{chat.pinned ? "Unpin" : "Pin"}</button><button type="button" onClick={() => remove(chat.characterId)} className="flex min-h-10 items-center gap-2 rounded-lg bg-[#fff0f2] px-3 text-[11px] text-[#a6234b]"><Trash2 size={13}/>Delete chat</button></div>}
        </div>;
      })}</div>}
      </section>
      <button type="button" onClick={() => nav.push({ name: "create" })} className="mx-5 mt-6 flex w-[calc(100%-40px)] items-center gap-3 rounded-xl bg-[#f6f0f3] p-4 text-left"><Plus size={18} className="text-[#a95173]"/><span className="flex-1 text-[12px] font-semibold">Someone you have in mind?</span><ArrowRight size={15} className="text-[#a95173]"/></button>
    </div>
  </main></WScreen>;
}
