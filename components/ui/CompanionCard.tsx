"use client";

import { ArrowUpRight } from "lucide-react";
import type { Character } from "@/lib/types";

export function CompanionCard({ character, onOpen }: { character: Character; onOpen(): void }) {
  return <button type="button" onClick={onOpen} className="group min-w-0 overflow-hidden rounded-2xl border border-[#ebe5e7] bg-white text-left transition-colors hover:border-[#c797aa]">
    <div className="aspect-[5/4] overflow-hidden bg-[#eee8eb]">
      {character.photo ? <img src={character.photo} alt={character.name} loading="lazy" decoding="async" className="h-full w-full object-cover object-[center_30%] transition-transform duration-300 group-hover:scale-[1.03]"/> : <div className="grid h-full place-items-center text-[32px] font-semibold text-[#a26c80]">{character.name.slice(0,1)}</div>}
    </div>
    <div className="p-3"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-[15px] font-bold">{character.name}</h2><ArrowUpRight size={15} className="shrink-0 text-[#a29199]"/></div><p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#857780]">{character.tagline}</p><p className="mt-3 text-[9px] font-semibold uppercase tracking-[.12em] text-[#a26c80]">{character.category} · AI companion</p></div>
  </button>;
}
