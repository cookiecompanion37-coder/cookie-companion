"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cookie, Moon, Plus, Search, Sparkles } from "lucide-react";
import { Chip } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { useNav } from "@/lib/nav";
import { CATEGORIES } from "@/lib/constants";
import { SEED_CHARACTERS } from "@/lib/seed";
import { setState, useAppState } from "@/lib/store";
import type { Character, Category } from "@/lib/types";

let sharedCache: Character[] | null = null;
export function DiscoverScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "Mine">("Trending");
  const shared = state.sharedCharacters;
  const [loading, setLoading] = useState(sharedCache === null);

  useEffect(() => {
    if (sharedCache) return;
    let alive = true;
    void fetch("/api/characters", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ characters?: Character[] }> : { characters: [] })
      .then((data) => {
        if (!alive) return;
        sharedCache = Array.isArray(data.characters) ? data.characters : [];
        setState((current) => {
          const known = new Set(current.sharedCharacters.map((character) => character.id));
          const fresh = sharedCache!.filter((character) => character.id && !known.has(character.id));
          return fresh.length ? { ...current, sharedCharacters: [...current.sharedCharacters, ...fresh] } : current;
        });
      })
      .catch(() => { sharedCache = []; })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const list = useMemo(() => {
    const pool = category === "Mine" ? state.customCharacters : [...state.customCharacters.filter((character) => character.isPublic), ...shared, ...SEED_CHARACTERS];
    const seen = new Set<string>();
    const unique = pool.filter((character) => { if (seen.has(character.name)) return false; seen.add(character.name); return true; });
    const filtered = category === "Mine" ? unique : category === "Trending" ? unique : unique.filter((character) => character.category === category);
    const query = search.trim().toLowerCase();
    return filtered.filter((character) => !query || `${character.name} ${character.tagline} ${character.personality} ${character.creator}`.toLowerCase().includes(query));
  }, [category, search, state.customCharacters, shared]);

  const featured = SEED_CHARACTERS[0];
  return (
    <WScreen id={state.wallpaper}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-5 pt-[max(22px,env(safe-area-inset-top))]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a33b5e]">Find someone</p>
              <h1 className="mt-0.5 font-display text-[27px] font-semibold text-[#34101d]">Discover</h1>
            </div>
            <button type="button" onClick={() => nav.push({ name: "create" })} aria-label="Create a companion" className="press grid h-10 w-10 place-items-center rounded-full brand-gradient text-white shadow-[0_10px_22px_-12px_rgba(214,18,83,.9)]"><Plus size={19} /></button>
          </div>
          <label className="glass mt-3.5 flex min-h-12 items-center gap-2.5 rounded-full px-4">
            <Search size={17} className="text-[#a33b5e]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search companions" placeholder="Search names, vibes, stories…" className="min-w-0 flex-1 bg-transparent text-[14px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/70" />
          </label>
        </header>

        <div className="no-scrollbar -mx-0 mt-3 flex shrink-0 gap-2 overflow-x-auto px-5 pb-1">
          {[...CATEGORIES, "Mine" as const].map((item) => <Chip key={item} selected={category === item} size="sm" onClick={() => setCategory(item)}>{item}</Chip>)}
        </div>

        <section className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-[104px]">
          {category === "Trending" && !search && featured && (
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} type="button" onClick={() => nav.openSheet({ name: "character", characterId: featured.id })} className="relative mb-4 block w-full overflow-hidden rounded-[26px] text-left shadow-[0_22px_40px_-24px_rgba(160,20,70,.7)]">
              <div className="relative h-[158px] w-full">
                <img src={featured.photo} alt={featured.name} className="h-full w-full object-cover object-[center_30%]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(30,5,15,.72),rgba(30,5,15,.18)_60%,transparent)]" />
                <div className="absolute inset-y-0 left-4 flex max-w-[62%] flex-col justify-center text-white">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur-md"><Sparkles size={9} /> featured</span>
                  <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight">{featured.name}</h2>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">{featured.tagline}</p>
                  <span className="mt-2.5 w-fit rounded-full bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#c60f4d]">Meet {featured.name}</span>
                </div>
              </div>
            </motion.button>
          )}

          {list.length === 0 ? (
            <div className="card mt-2 flex flex-col items-center px-6 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#ffe3ec] text-[#c60f4d]">{loading ? <Cookie size={24} /> : <Moon size={24} />}</span>
              <h2 className="mt-3 font-display text-[19px] font-semibold">{loading ? "Looking around…" : category === "Mine" ? "No creations yet" : "No one by that name"}</h2>
              <p className="mt-1 max-w-[250px] text-[12px] leading-relaxed text-[#8a596b]">{category === "Mine" ? "Make a companion who feels like your kind of story." : "Try another word or category."}</p>
              {category === "Mine" && <button type="button" onClick={() => nav.push({ name: "create" })} className="press mt-4 rounded-full brand-gradient px-5 py-2.5 text-[12px] font-bold text-white">Create a companion</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 items-start gap-3">
              {list.map((character, index) => (
                <motion.button
                  key={`${character.id}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  type="button"
                  onClick={() => nav.openSheet({ name: "character", characterId: character.id })}
                  className={`press relative block w-full overflow-hidden rounded-[22px] text-left shadow-[0_18px_34px_-24px_rgba(120,20,60,.75)] ${index % 2 ? "mt-4" : ""}`}
                >
                  <div className={`relative w-full ${index % 3 === 1 ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
                    {character.photo ? (
                      <img src={character.photo} alt={character.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[linear-gradient(150deg,#ffd9e5,#ffeedf_60%,#efe2ff)] text-5xl">{character.emoji}</div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,12,0)_40%,rgba(20,4,12,.78))]" />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-white/25 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white backdrop-blur-md">{character.category}</span>
                    <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7fe3b4]" />{character.chats > 999 ? `${(character.chats / 1000).toFixed(1)}k` : character.chats}
                    </span>
                    <div className="absolute inset-x-2.5 bottom-2.5 text-white">
                      <h2 className="flex items-center gap-1 truncate font-display text-[16px] font-semibold leading-tight">{character.name}{character.isMine && <Sparkles size={11} className="shrink-0 text-[#c60f4d]" />}</h2>
                      <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-white/75">{character.tagline}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      </main>
    </WScreen>
  );
}
