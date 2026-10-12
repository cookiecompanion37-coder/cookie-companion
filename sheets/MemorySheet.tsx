"use client";

import { useState } from "react";
import { Brain, Trash2 } from "lucide-react";
import { Button, Chip } from "@/components/ui/Button";
import { findCharacter } from "@/lib/engine/engineUtils";
import { allCharacters } from "@/lib/engine/engineUtils";
import { setState, useAppState } from "@/lib/store";

export function MemorySheet(): React.JSX.Element {
  const state = useAppState(); const characters = allCharacters(state); const [selected, setSelected] = useState("");
  const characterId = characters.some((character) => character.id === selected) ? selected : characters.find((character) => (state.memory[character.id] ?? []).length > 0)?.id ?? characters[0]?.id ?? "";
  const character = findCharacter(state, characterId); const facts = state.memory[characterId] ?? [];
  const remove = (fact: string) => setState((current) => ({ ...current, memory: { ...current.memory, [characterId]: (current.memory[characterId] ?? []).filter((item) => item !== fact) } }));
  const clear = () => setState((current) => { const memory = { ...current.memory }; delete memory[characterId]; return { ...current, memory }; });
  return <div className="pb-3"><div className="flex items-center gap-3 rounded-[20px] bg-lavender/25 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70"><Brain size={21}/></span><div><h2 className="font-display font-bold">A few things remembered</h2><p className="text-xs text-choc-soft">Memory stays on this device and is yours to edit.</p></div></div>
    {characters.length > 0 && <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">{characters.map((item) => <Chip key={item.id} selected={characterId === item.id} size="sm" onClick={() => setSelected(item.id)}>{item.name}</Chip>)}</div>}
    {character && <h3 className="mt-4 font-display text-lg font-bold">{character.name}</h3>}
    {facts.length === 0 ? <div className="py-8 text-center"><p className="text-sm font-bold">Nothing to remember yet.</p><p className="mt-1 text-xs text-choc-soft">Little details may show up here as you chat.</p></div> : <ul className="mt-2 space-y-2">{facts.map((fact) => <li key={fact} className="flex items-start gap-2 rounded-[18px] bg-white/70 p-3"><span className="flex-1 text-sm leading-relaxed">{fact}</span><button type="button" aria-label={`Delete memory: ${fact}`} onClick={() => remove(fact)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-choc-soft"><Trash2 size={16}/></button></li>)}</ul>}
    {facts.length > 0 && <Button variant="clay" full className="mt-3" onClick={clear}>Clear {character?.name}&apos;s memories</Button>}
  </div>;
}
