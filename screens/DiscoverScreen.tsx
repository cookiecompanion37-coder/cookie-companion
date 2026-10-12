"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Chip } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { useNav } from "@/lib/nav";
import { CATEGORIES } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { useAppState } from "@/lib/store";
import type { Character, Category } from "@/lib/types";

let hasMountedDiscover = false;
export function DiscoverScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav();
  const [search, setSearch] = useState(""); const [category, setCategory] = useState<Category | "Mine">("Trending"); const [loading, setLoading] = useState(!hasMountedDiscover);
  useEffect(() => {
    if (hasMountedDiscover) { setLoading(false); return; }
    const timer = window.setTimeout(() => { hasMountedDiscover = true; setLoading(false); }, 400);
    return () => window.clearTimeout(timer);
  }, []);
  const list = useMemo(() => {
    const source = category === "Mine" ? state.customCharacters : [
      ...state.customCharacters.filter((character) => character.isPublic && (category === "Trending" || character.category === category)),
      ...SEED_CHARACTERS.filter((character) => category === "Trending" || character.category === category),
    ];
    const query = search.trim().toLowerCase();
    return source.filter((character) => !query || `${character.name} ${character.tagline} ${character.personality} ${character.creator}`.toLowerCase().includes(query));
  }, [category, search, state.customCharacters]);
  const open = (character: Character) => nav.openSheet({ name: "character", characterId: character.id });
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[105px] pt-[max(24px,env(safe-area-inset-top))]">
    <div className="mesh-bg"/><header className="shrink-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-choc-soft">a little window into their world</p><h1 className="mt-1 font-display text-3xl font-bold">Discover</h1><label className="clay mt-4 flex min-h-12 items-center gap-2 rounded-[18px] px-4"><Search size={18} className="text-choc-soft"/><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search companions" placeholder="Search names, vibes, stories…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-choc-soft/60"/></label></header>
    <div className="no-scrollbar -mx-5 mt-3 flex shrink-0 gap-2 overflow-x-auto px-5 pb-2">{[...CATEGORIES, "Mine" as const].map((item) => <Chip key={item} selected={category === item} size="sm" onClick={() => setCategory(item)}>{item}</Chip>)}</div>
    <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-4">
      {loading ? <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className={`h-[220px] ${index % 2 ? "mt-5" : ""}`}/>)}</div> : list.length === 0 ? <EmptyState mood="sleep" title={category === "Mine" ? "No creations yet" : "No crumbs here yet"} body={category === "Mine" ? "Make a companion who feels like your kind of story." : "Try another word or category and see who turns up."} action={category === "Mine" ? <button type="button" onClick={() => nav.push({ name: "create" })} className="min-h-11 rounded-full bg-biscuit px-5 font-bold text-white">Create a companion</button> : undefined}/> : <div className="grid grid-cols-2 items-start gap-3">
        {list.map((character, index) => <button key={character.id} type="button" onClick={() => open(character)} className={`clay flex flex-col overflow-hidden rounded-[24px] p-3 text-left transition-transform active:scale-[.98] ${index % 2 ? "mt-5" : ""}`}>
          <div className="relative flex h-[138px] w-full items-center justify-center overflow-hidden rounded-[19px]" style={{ background: `radial-gradient(circle at 50% 20%,rgba(255,255,255,.65),transparent 58%),linear-gradient(145deg,${character.accent}88,#fff0da)` }}><span className="absolute -right-1 -top-3 rotate-12 text-5xl opacity-70">✦</span><span className="text-6xl drop-shadow-sm">{character.emoji}</span><span className="absolute bottom-2 left-2 rounded-full bg-white/75 px-2 py-1 text-[9px] font-bold text-choc">{character.category}</span></div>
          <div className="mt-3 flex items-center justify-between gap-1"><h2 className="truncate font-display text-lg font-bold">{character.name}</h2><span className="text-xs">🎙</span></div><p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-choc-soft">{character.tagline}</p><div className="mt-2 flex w-full items-center justify-between text-[10px] text-choc-soft"><span className="truncate">by {character.creator}</span><span className="flex shrink-0 items-center gap-1"><Sparkles size={11}/>{character.chats > 999 ? `${(character.chats / 1000).toFixed(1)}k` : character.chats}</span></div>
        </button>)}
      </div>}
    </section>
  </main>;
}
