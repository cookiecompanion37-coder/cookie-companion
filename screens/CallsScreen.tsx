"use client";

import { useEffect, useState } from "react";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { WScreen } from "@/components/ui/WallpaperBg";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { SEED_CHARACTERS } from "@/lib/seed";
import type { CallLog } from "@/lib/types";

type Group = { label: string; calls: CallLog[] };
export function CallsScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const { requestCall, startChat } = useEngine();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const buckets = new Map<string, CallLog[]>();
    for (const call of state.calls) {
      const date = new Date(call.startedAt);
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const label = day.getTime() === today.getTime() ? "Today" : day.getTime() === yesterday.getTime() ? "Yesterday" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(day);
      buckets.set(label, [...(buckets.get(label) ?? []), call]);
    }
    setGroups(Array.from(buckets, ([label, calls]) => ({ label, calls })));
  }, [state.calls]);

  const timeLabel = (ts: number) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(ts);
  const callBack = (log: CallLog) => { startChat(log.characterId); requestCall(log.characterId); nav.push({ name: "chat", characterId: log.characterId }); };

  return (
    <WScreen id={state.wallpaper}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-5 pt-[max(22px,env(safe-area-inset-top))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a33b5e]">Hear their voice</p>
          <h1 className="mt-0.5 font-display text-[27px] font-semibold text-[#34101d]">Calls</h1>
        </header>

        <section className="shrink-0 px-5 pt-4">
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {SEED_CHARACTERS.slice(0, 6).map((character) => (
              <button key={character.id} type="button" onClick={() => { startChat(character.id); requestCall(character.id); nav.push({ name: "chat", characterId: character.id }); }} className="press flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-[22px] border border-white/60 bg-white/40 px-2 py-3 backdrop-blur-md">
                <Avatar character={character} size={54} online />
                <span className="w-full truncate text-center text-[10px] font-bold text-[#5c2a3b]">{character.name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ffe3ec] px-2 py-0.5 text-[8.5px] font-bold text-[#c60f4d]"><Sparkles size={8} />call</span>
              </button>
            ))}
          </div>
        </section>

        <section className="no-scrollbar mt-4 flex-1 overflow-y-auto px-5 pb-[104px]">
          {groups.length === 0 ? (
            <div className="card mt-2 flex flex-col items-center px-6 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#ffe3ec] text-[#c60f4d]"><PhoneCall size={24} /></span>
              <h2 className="mt-3 font-display text-[19px] font-semibold">No calls just yet</h2>
              <p className="mt-1 max-w-[250px] text-[12px] leading-relaxed text-[#8a596b]">Tap a friend above or ask your companion to call. Little conversations land here.</p>
            </div>
          ) : groups.map((group) => (
            <div key={group.label} className="mb-5">
              <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">{group.label}</h2>
              <div className="space-y-2">
                {group.calls.map((log) => {
                  const character = findCharacter(state, log.characterId);
                  if (!character) return null;
                  const missed = log.outcome !== "answered";
                  const Icon = missed ? PhoneMissed : log.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
                  return (
                    <div key={log.id} className="card flex items-center gap-3 rounded-[22px] p-2.5">
                      <Avatar character={character} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Icon size={12} className={missed ? "text-[#e5395c]" : "text-[#45b98a]"} />
                          <h3 className="truncate font-display text-[14px] font-semibold text-[#34101d]">{character.name}</h3>
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-[#8a596b]">{timeLabel(log.startedAt)} · {missed ? (log.outcome === "missed" ? "missed" : "declined") : formatTime(log.durationSec)}</p>
                      </div>
                      <button type="button" onClick={() => callBack(log)} aria-label={`Call ${character.name} back`} className="press flex min-h-9 items-center gap-1.5 rounded-full bg-[#ffe3ec] px-3 text-[10.5px] font-bold text-[#c60f4d]">
                        <PhoneOutgoing size={12} /> Call back
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
    </WScreen>
  );
}
