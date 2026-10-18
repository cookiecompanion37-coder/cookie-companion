"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Plus, Search, X } from "lucide-react";
import { WScreen } from "@/components/ui/WallpaperBg";
import { CompanionCard } from "@/components/ui/CompanionCard";
import { useNav } from "@/lib/nav";
import { CATEGORIES } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { setState, useAppState } from "@/lib/store";
import type { Character, Category } from "@/lib/types";

const fetcher = async (url: string): Promise<{ characters: Character[] }> => { const response = await fetch(url); if (!response.ok) throw new Error("Community unavailable"); return response.json(); };
export function DiscoverScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "Mine">("Trending");
  const { data, error } = useSWR("/api/characters", fetcher, { revalidateOnFocus: false });
  useEffect(() => { if (data?.characters) setState(s => ({ ...s, sharedCharacters: data.characters })); }, [data]);
  const list = useMemo(() => {
    const pool = category === "Mine" ? state.customCharacters : [...state.customCharacters.filter(c => c.isPublic), ...(data?.characters ?? state.sharedCharacters), ...SEED_CHARACTERS];
    const seen = new Set<string>();
    return pool.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return (category === "Trending" || category === "Mine" || c.category === category) && (!search.trim() || `${c.name} ${c.tagline} ${c.personality}`.toLowerCase().includes(search.trim().toLowerCase())); });
  }, [category, search, data, state.customCharacters, state.sharedCharacters]);
  return <WScreen id={state.wallpaper}><main className="flex h-full flex-col">
    <header className="shrink-0 px-5 pb-4 pt-[max(28px,env(safe-area-inset-top))]"><div className="flex items-center justify-between"><div><p className="eyebrow">A little connection</p><h1 className="mt-1 text-[30px] font-bold tracking-[-.045em]">Find your people.</h1></div><button type="button" onClick={() => nav.push({ name: "create" })} aria-label="Create a companion" className="icon-control"><Plus size={20}/></button></div>
      <label className="mt-5 flex h-12 items-center gap-3 rounded-xl bg-[#f2eff1] px-3.5"><Search size={18} className="text-[#968992]"/><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search companions" placeholder="A name, a vibe, a shared interest…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#968992]"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}</label>
    </header>
    <div className="no-scrollbar flex shrink-0 gap-5 overflow-x-auto border-b border-[#ebe5e7] px-5" role="group" aria-label="Companion categories">{[...CATEGORIES, "Mine" as const].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 shrink-0 border-b-2 pb-2 text-[12px] font-semibold ${category === item ? "border-[#a95173] text-[#994767]" : "border-transparent text-[#91838b]"}`}>{item === "Trending" ? "For you" : item}</button>)}</div>
    <section className="discovery-content no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-5">
      {!search && category === "Trending" && <button type="button" onClick={() => nav.push({ name: "create" })} className="mb-6 flex w-full items-center gap-3 rounded-xl bg-[#f6f0f3] p-4 text-left"><div className="flex-1"><strong className="block text-[13px] font-bold">Your imagination. Their personality.</strong><span className="mt-1 block text-[11px] text-[#857780]">Make a companion that is entirely your kind.</span></div><ArrowRight size={17} className="text-[#a95173]"/></button>}
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[12px] font-semibold text-[#857780]">{category === "Mine" ? "Made by you" : search ? "Search results" : "Someone for every side of you"}</h2><span className="text-[11px] text-[#a2969d]">{list.length}</span></div>
      {error && <p role="status" className="mb-3 text-[11px] text-[#857780]">Community is temporarily unavailable. Showing the Cookie collection.</p>}
      {list.length ? <div className="discovery-grid grid grid-cols-2 gap-3">{list.map(character => <CompanionCard key={character.id} character={character} onOpen={() => nav.openSheet({ name: "character", characterId: character.id })}/>)}</div> : <div className="py-16 text-center"><Search size={24} className="mx-auto text-[#b9a7af]"/><h2 className="mt-4 text-[18px] font-bold">{category === "Mine" ? "Something only you could create." : "No matches just yet."}</h2><p className="mt-2 text-[13px] text-[#857780]">{category === "Mine" ? "Your companions will appear here." : "Try a different name or choose another category."}</p></div>}
    </section>
  </main></WScreen>;
}
