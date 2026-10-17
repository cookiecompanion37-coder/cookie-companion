"use client";

import { Heart, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { formatTime } from "@/lib/utils";

export function CallSummarySheet({ logId }: { logId: string }): React.JSX.Element {
  const state = useAppState();
  const { closeSheet, push } = useNav();
  const { send } = useEngine();
  const log = state.calls.find((entry) => entry.id === logId);
  const character = log ? findCharacter(state, log.characterId) : undefined;
  const memories = log ? state.memory[log.characterId] ?? [] : [];
  if (!log || !character) return <div className="py-8 text-center text-sm">This call summary is no longer here.</div>;
  const handleHeart = () => { closeSheet(); push({ name: "chat", characterId: character.id }); send(character.id, "sending you a little heart for our call ❤️"); };
  return (
    <div className="flex flex-col items-center pb-2 text-center">
      <div className="relative">
        <Avatar character={character} size={92} />
        <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-[#e9f8f1] text-[#45b98a] ring-2 ring-white"><Phone size={14} /></span>
      </div>
      <h2 className="mt-3 font-display text-[21px] font-semibold text-[#34101d]">That was lovely</h2>
      <p className="mt-1 text-[12px] text-[#8a596b]">You and {character.name} talked for {formatTime(log.durationSec)}.</p>
      <div className="mt-4 w-full rounded-[20px] bg-[#fff0f4] p-3.5 text-left">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Call recap</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#4c1d2d]">A quiet moment together. Your conversation stays on this device.</p>
        <p className="mt-3 text-[10px] font-bold text-[#a33b5e]">{character.name} will remember</p>
        {memories.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">{memories.slice(-3).map((memory) => <span key={memory} className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] text-[#4c1d2d]">{memory}</span>)}</div>
        ) : (
          <p className="mt-1 text-[10px] text-[#8a596b]">No new memories saved during this call.</p>
        )}
      </div>
      <Button full className="mt-4" onClick={handleHeart}><Heart size={15} fill="currentColor" />Send a little love</Button>
      <button type="button" onClick={closeSheet} className="mt-2 min-h-10 px-4 text-[11px] font-bold text-[#8a596b]">Done</button>
    </div>
  );
}
