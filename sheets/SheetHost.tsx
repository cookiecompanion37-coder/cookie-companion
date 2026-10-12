"use client";

import type { ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CallSummarySheet } from "@/components/call/CallSummarySheet";
import { CharacterSheet } from "@/sheets/CharacterSheet";
import { MemorySheet } from "@/sheets/MemorySheet";
import { PaywallSheet } from "@/sheets/PaywallSheet";
import { useNav } from "@/lib/nav";
import { resetAll } from "@/lib/store";
import { DeleteDataSheet, MinorGateSheet, OutOfMinutesSheet, ReportSheet, SafetySheet } from "@/sheets/SmallSheets";

export function SheetHost(): React.JSX.Element | null {
  const nav = useNav(); const sheet = nav.sheet;
  if (!sheet) return null;
  let content: ReactNode = null; let title = "Cookie"; let tall = false;
  switch (sheet.name) {
    case "paywall": title = "Plans & call minutes"; tall = true; content = <PaywallSheet/>; break;
    case "character": title = "Meet your companion"; content = <CharacterSheet characterId={sheet.characterId}/>; break;
    case "memory": title = "Memory"; content = <MemorySheet/>; break;
    case "report": title = "Report a character"; content = <ReportSheet characterId={sheet.characterId}/>; break;
    case "callSummary": title = "Call summary"; content = <CallSummarySheet logId={sheet.logId}/>; break;
    case "outOfMinutes": title = "Call minutes"; content = <OutOfMinutesSheet/>; break;
    case "deleteData": title = "Delete data"; content = <DeleteDataSheet/>; break;
    case "minorGate": title = "A note about age"; content = <MinorGateSheet/>; break;
    case "safety": title = "Support & resources"; tall = true; content = <SafetySheet/>; break;
  }
  const close = () => {
    if (sheet.name === "minorGate") { resetAll(); nav.setTab("chats"); }
    nav.closeSheet();
  };
  return <Sheet open onClose={close} title={title} tall={tall}>{content}</Sheet>;
}
