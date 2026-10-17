"use client";

import { useState } from "react";
import { Brain, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { allCharacters, findCharacter } from "@/lib/engine/engineUtils";
import { setState, useAppState } from "@/lib/store";

export function MemorySheet({ characterId }: { characterId?: string }): React.JSX.Element {
  const state = useAppState();
  const characters = allCharacters(state);
  const [selected, setSelected] = useState(characterId ?? "");
  const activeId = characters.some((character) => character.id === selected) ? selected : characters.find((character) => (state.memory[character.id] ?? []).length > 0)?.id ?? characters[0]?.id ?? "";
  const character = findCharacter(state, activeId);
  const facts = state.memory[activeId] ?? [];
  const remove = (fact: string) => setState((current) => ({ ...current, memory: { ...current.memory, [activeId]: (current.memory[activeId] ?? []).filter((item) => item !== fact) } }));
  const clear = () => setState((current) => { const memory = { ...current.memory }; delete memory[activeId]; return { ...current, memory }; });

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#f4ecff] p-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/70 text-[#7b4bd8]"><Brain size={19} /></span>
        <div>
          <h2 className="font-display text-[14px] font-semibold text-[#34101d]">A few things remembered</h2>
          <p className="text-[10px] text-[#8a596b]">Memory lives on this device and is yours to edit.</p>
        </div>
      </div>

      {characters.length > 0 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {characters.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[10.5px] font-bold ${activeId === item.id ? "border-[#f5286e] bg-white text-[#c60f4d]" : "border-white/70 bg-white/50 text-[#8a596b]"}`}>
              <Avatar character={item} size={22} ring={false} />{item.name}
            </button>
          ))}
        </div>
      )}

      {character && <h3 className="mt-4 font-display text-[16px] font-semibold text-[#34101d]">{character.name} remembers</h3>}
      {facts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[12px] font-semibold text-[#5c2a3b]">Nothing saved yet.</p>
          <p className="mt-0.5 text-[10px] text-[#8a596b]">Little details show up here as you chat.</p>
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {facts.map((fact) => (
            <li key={fact} className="flex items-start gap-2 rounded-[16px] bg-white/60 p-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5286e]" />
              <span className="flex-1 text-[12px] leading-relaxed text-[#4c1d2d]">{fact}</span>
              <button type="button" aria-label={`Delete memory: ${fact}`} onClick={() => remove(fact)} className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#a97c8b]"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      {facts.length > 0 && <Button variant="soft" full className="mt-3" onClick={clear}>Clear {character?.name}&apos;s memories</Button>}
    </div>
  );
}
