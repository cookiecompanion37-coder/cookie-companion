"use client";

import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import type { CallLog } from "@/lib/types";

type Group = { label: string; calls: CallLog[] };
export function CallsScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav(); const { requestCall, startChat } = useEngine(); const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const buckets = new Map<string, CallLog[]>();
    for (const call of state.calls) {
      const date = new Date(call.startedAt); const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const label = day.getTime() === today.getTime() ? "Today" : day.getTime() === yesterday.getTime() ? "Yesterday" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(day);
      buckets.set(label, [...(buckets.get(label) ?? []), call]);
    }
    setGroups(Array.from(buckets, ([label, calls]) => ({ label, calls })));
  }, [state.calls]);
  const timeLabel = (ts: number) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(ts);
  const callBack = (log: CallLog) => { startChat(log.characterId); requestCall(log.characterId); nav.push({ name: "chat", characterId: log.characterId }); };
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[105px] pt-[max(26px,env(safe-area-inset-top))]"><div className="mesh-bg"/><header className="shrink-0"><h1 className="font-display text-[27px] font-bold">Calls</h1><p className="mt-1 text-sm text-choc-soft">A quiet log of conversations you shared.</p></header>
    <section className="no-scrollbar mt-5 flex-1 overflow-y-auto pb-3">{groups.length === 0 ? <EmptyState mood="sleep" title="No calls just yet" body="When you and a companion talk, you&apos;ll find the little details here."/> : groups.map((group) => <div key={group.label} className="mb-5"><h2 className="mb-2 font-display text-lg font-bold">{group.label}</h2>{group.calls.map((log) => {
      const character = findCharacter(state, log.characterId); if (!character) return null;
      const missed = log.outcome !== "answered"; const Icon = missed ? PhoneMissed : log.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
      return <div key={log.id} className="clay mb-2 flex items-center gap-3 rounded-[22px] p-3"><Avatar character={character} size={48}/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Icon size={14} className={missed ? "text-danger" : "text-ok"}/><h3 className="truncate font-display font-bold">{character.name}</h3></div><p className="mt-1 text-xs text-choc-soft">{timeLabel(log.startedAt)} · {missed ? log.outcome : formatTime(log.durationSec)}</p></div><button type="button" onClick={() => callBack(log)} className="flex min-h-11 items-center gap-1 rounded-full bg-ok/15 px-3 text-xs font-bold text-choc"><span>Call back</span></button></div>;
    })}</div>)}</section>
  </main>;
}
