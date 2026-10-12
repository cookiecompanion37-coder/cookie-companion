"use client";

import { Phone, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie } from "@/components/ui/Cookie";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { formatTime } from "@/lib/utils";
import { useAppState } from "@/lib/store";
import { useNav } from "@/lib/nav";

export function CallSummarySheet({ logId }: { logId: string }): React.JSX.Element {
  const state = useAppState(); const { closeSheet, push } = useNav(); const { send } = useEngine();
  const log = state.calls.find((entry) => entry.id === logId); const character = log ? findCharacter(state, log.characterId) : undefined;
  const memories = log ? state.memory[log.characterId] ?? [] : [];
  if (!log || !character) return <div className="py-8 text-center text-sm">This call summary is no longer here.</div>;
  const handleHeart = () => { closeSheet(); push({ name: "chat", characterId: character.id }); send(character.id, "sending you a little heart for our call ❤️"); };
  return <div className="flex flex-col items-center pb-4 text-center"><Cookie size={84} mood="blush" bites={2}/><div className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-ok/20 text-ok"><Phone size={21}/></div><h2 className="mt-3 font-display text-2xl font-bold">That was lovely</h2><p className="mt-1 text-sm text-choc-soft">You and {character.name} talked for {formatTime(log.durationSec)}.</p><div className="mt-4 w-full rounded-[22px] bg-cream-2/80 p-4 text-left"><p className="text-xs font-bold uppercase tracking-wide text-choc-soft">A little call recap</p><p className="mt-2 text-sm">You spent {formatTime(log.durationSec)} together. Your conversation stays on this device.</p><p className="mt-3 text-xs font-bold text-choc-soft">{character.name} will remember</p>{memories.length ? <div className="mt-2 flex flex-wrap gap-2">{memories.slice(-3).map((memory) => <span key={memory} className="rounded-full bg-white/75 px-3 py-1.5 text-xs">{memory}</span>)}</div> : <p className="mt-1 text-xs text-choc-soft">No new memories saved during this call.</p>}</div><Button full className="mt-5" onClick={handleHeart}><Heart size={17} fill="currentColor"/>Send a ❤️</Button><button type="button" onClick={closeSheet} className="mt-2 min-h-11 px-4 text-sm font-bold text-choc-soft">Done</button></div>;
}
