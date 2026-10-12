"use client";

import { useState } from "react";
import { MessageCircle, Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Chip } from "@/components/ui/Button";
import { BOND_THRESHOLDS } from "@/lib/constants";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";

export function CharacterSheet({ characterId }: { characterId: string }): React.JSX.Element {
  const state = useAppState(); const nav = useNav(); const { startChat } = useEngine(); const [previewing, setPreviewing] = useState(false);
  const character = findCharacter(state, characterId);
  if (!character) return <div className="py-8 text-center text-sm">This companion isn&apos;t here anymore.</div>;
  const sent = state.chats[characterId]?.sent ?? 0;
  const bond = Math.max(1, BOND_THRESHOLDS.reduce((level, threshold, index) => sent >= threshold ? index + 1 : level, 1));
  const tags = character.personality.split(/,\s*/).slice(0, 5);
  const begin = () => { startChat(characterId); nav.closeSheet(); nav.push({ name: "chat", characterId }); };
  return <div className="pb-3"><div className="flex flex-col items-center text-center"><Avatar character={character} size={100} ring/><h2 className="mt-3 font-display text-2xl font-bold">{character.name}</h2><p className="mt-1 text-sm text-choc-soft">{character.age} · {character.tagline}</p><p className="mt-2 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold">AI companion · fictional character</p></div>
    <div className="mt-5"><h3 className="font-display font-bold">A little about them</h3><p className="mt-1 text-sm leading-relaxed text-choc-soft">{character.bio}</p><div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <Chip key={tag} size="sm">{tag}</Chip>)}</div></div>
    <div className="mt-5 rounded-[20px] bg-white/60 p-4"><div className="flex items-center justify-between"><div><h3 className="font-display font-bold">Voice</h3><p className="mt-1 text-sm text-choc-soft">{character.voice}</p></div><button type="button" aria-label="Preview voice" onClick={() => { setPreviewing(true); speak(character.greeting, character, { onEnd: () => setPreviewing(false) }); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-biscuit/20 text-biscuit-deep"><Volume2 size={19}/></button></div></div>
    <div className="mt-4 flex items-center justify-between rounded-[20px] bg-cream-2/70 p-4"><div><h3 className="font-display font-bold">Your bond</h3><p className="text-xs text-choc-soft">{sent} messages · growing at your pace</p></div><span aria-label={`Bond level ${bond}`} className="text-lg">{"❤️".repeat(bond)}</span></div>
    <Button full size="lg" className="mt-5" onClick={begin}><MessageCircle size={18}/>Start chatting</Button>
    {previewing && <p className="mt-2 text-center text-xs text-choc-soft">Playing a voice preview…</p>}
  </div>;
}
