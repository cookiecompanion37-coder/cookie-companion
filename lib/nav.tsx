"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";

export type TabId = "chats" | "discover" | "calls" | "me";
export type Route = { name: "chat"; characterId: string } | { name: "create" };
export type SheetState = { name: "paywall" } | { name: "character"; characterId: string } | { name: "memory" } | { name: "report"; characterId?: string } | { name: "callSummary"; logId: string } | { name: "outOfMinutes" } | { name: "deleteData" } | { name: "minorGate" } | { name: "safety" };
export interface Nav { tab: TabId; setTab(t: TabId): void; stack: Route[]; push(r: Route): void; pop(): void; replace(r: Route): void; resetStack(): void; sheet: SheetState | null; openSheet(s: SheetState): void; closeSheet(): void; }
const NavContext = createContext<Nav | null>(null);
export function NavProvider({ children }: { children: ReactNode }): JSX.Element {
  const [tab, setTab] = useState<TabId>("chats");
  const [stack, setStack] = useState<Route[]>([]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const nav = useMemo<Nav>(() => ({ tab, setTab: (next) => { setTab(next); setStack([]); }, stack,
    push: (route) => setStack((current) => [...current, route]), pop: () => setStack((current) => current.slice(0, -1)),
    replace: (route) => setStack((current) => current.length ? [...current.slice(0, -1), route] : [route]), resetStack: () => setStack([]),
    sheet, openSheet: setSheet, closeSheet: () => setSheet(null),
  }), [tab, stack, sheet]);
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}
export function useNav(): Nav {
  const value = useContext(NavContext);
  if (!value) throw new Error("useNav must be used within NavProvider");
  return value;
}
