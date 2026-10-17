"use client";

import { motion } from "framer-motion";
import { MessageCircle, Compass, Phone, UserRound, Plus } from "lucide-react";
import type { TabId } from "@/lib/nav";
import { cn } from "@/lib/utils";

const tabs: { id: TabId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle }, { id: "discover", label: "Discover", icon: Compass },
  { id: "calls", label: "Calls", icon: Phone }, { id: "me", label: "Me", icon: UserRound },
];
export function TabBar({ tab, onTab, onCreate, unread }: { tab: TabId; onTab(t: TabId): void; onCreate(): void; unread: number }): React.JSX.Element {
  const renderTab = (id: TabId) => {
    const item = tabs.find((entry) => entry.id === id);
    if (!item) return null;
    const Icon = item.icon; const selected = tab === id;
    return <button key={id} type="button" onClick={() => onTab(id)} aria-current={selected ? "page" : undefined} className={cn("relative flex min-h-[56px] min-w-[50px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition-colors", selected ? "text-choc" : "text-choc-soft/75")}>
      <span className={cn("relative grid h-8 w-[52px] place-items-center rounded-full transition-all", selected && "shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_16px_-8px_rgba(214,124,178,.7)] [background:linear-gradient(135deg,#ffe3bb,#ffc3de_55%,#cdb9ff)]")}>
        <Icon size={20} strokeWidth={selected ? 2.8 : 2.2}/>
        {id === "chats" && unread > 0 && <span className="absolute -right-1 -top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[9px] text-white">{unread > 9 ? "9+" : unread}</span>}
      </span>{item.label}
    </button>;
  };
  return <nav aria-label="Main navigation" className="glass absolute inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex h-[74px] items-center justify-between rounded-[28px] px-2 pb-1">
    {renderTab("chats")}{renderTab("discover")}
    <motion.button type="button" aria-label="Create a companion" onClick={onCreate} whileTap={{ scale: .9 }} className="clay-candy -mt-7 flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[22px]"><Plus size={26} strokeWidth={3}/></motion.button>
    {renderTab("calls")}{renderTab("me")}
  </nav>;
}
