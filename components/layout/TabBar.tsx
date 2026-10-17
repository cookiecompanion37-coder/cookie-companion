"use client";

import { motion } from "framer-motion";
import { Compass, MessageCircle, Phone, Plus, UserRound } from "lucide-react";
import type { TabId } from "@/lib/nav";
import { cn } from "@/lib/utils";

const tabs: { id: TabId; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "me", label: "Me", icon: UserRound },
];

export function TabBar({ tab, onTab, onCreate, unread }: { tab: TabId; onTab(t: TabId): void; onCreate(): void; unread: number }): React.JSX.Element {
  const renderTab = (id: TabId) => {
    const item = tabs.find((entry) => entry.id === id);
    if (!item) return null;
    const Icon = item.icon;
    const selected = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onTab(id)}
        aria-current={selected ? "page" : undefined}
        className={cn("relative flex min-h-[54px] min-w-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[9.5px] font-bold transition-colors", selected ? "text-[#c60f4d]" : "text-[#7d5260]/85")}
      >
        <span className="relative grid h-7 w-11 place-items-center">
          {selected && (
            <motion.span
              layoutId="tab-pill"
              transition={{ type: "spring", stiffness: 480, damping: 34 }}
              className="absolute inset-0 rounded-full brand-gradient opacity-[0.14]"
            />
          )}
          <Icon size={19} strokeWidth={selected ? 2.7 : 2.1} className="relative" />
          {id === "chats" && unread > 0 && (
            <span className="absolute -right-0.5 -top-1.5 min-w-[16px] rounded-full bg-[#f5286e] px-1 text-center text-[9px] leading-4 text-white shadow-sm">{unread > 9 ? "9+" : unread}</span>
          )}
        </span>
        {item.label}
      </button>
    );
  };
  return (
    <nav aria-label="Main navigation" className="tab-glass absolute inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex h-[68px] items-center justify-between rounded-[26px] px-1.5">
      {renderTab("chats")}
      {renderTab("discover")}
      <motion.button
        type="button"
        aria-label="Create a companion"
        onClick={onCreate}
        whileTap={{ scale: 0.9 }}
        className="brand-gradient -mt-8 flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] text-white shadow-[0_16px_32px_-12px_rgba(214,18,83,.85),inset_0_1px_0_rgba(255,255,255,.4)] ring-4 ring-[#ffe9f0]/80"
      >
        <Plus size={24} strokeWidth={2.8} />
      </motion.button>
      {renderTab("calls")}
      {renderTab("me")}
    </nav>
  );
}
