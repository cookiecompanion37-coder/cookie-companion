"use client";

import { Compass, MessageCircle, Phone, UserRound } from "lucide-react";
import type { TabId } from "@/lib/nav";

const tabs = [{ id: "chats", label: "Chats", icon: MessageCircle }, { id: "discover", label: "Explore", icon: Compass }, { id: "calls", label: "Calls", icon: Phone }, { id: "me", label: "You", icon: UserRound }] as const;
export function TabBar({ tab, onTab, unread }: { tab: TabId; onTab(t: TabId): void; onCreate(): void; unread: number }): React.JSX.Element {
  return <nav aria-label="Main navigation" className="absolute inset-x-0 bottom-0 z-30 flex border-t border-[#ebe5e7] bg-white px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">{tabs.map(item => {
    const selected = item.id === tab; const Icon = item.icon;
    return <button key={item.id} type="button" onClick={() => onTab(item.id)} aria-current={selected ? "page" : undefined} className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1.5 text-[10px] font-semibold ${selected ? "text-[#994767]" : "text-[#a2969d]"}`}><span className="relative"><Icon size={21} strokeWidth={selected ? 2.1 : 1.6}/>{item.id === "chats" && unread > 0 && <span className="absolute -right-2 -top-1 grid min-w-3.5 place-items-center rounded-full bg-[#a95173] px-1 text-[8px] text-white">{unread > 9 ? "9+" : unread}</span>}</span>{item.label}</button>;
  })}</nav>;
}
