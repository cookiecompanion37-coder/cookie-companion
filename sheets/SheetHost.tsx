"use client";

import type { ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { CallSummarySheet } from "@/components/call/CallSummarySheet";
import { CharacterSheet } from "@/sheets/CharacterSheet";
import { MemorySheet } from "@/sheets/MemorySheet";
import { PaywallSheet } from "@/sheets/PaywallSheet";
import { WallpaperSheet } from "@/sheets/WallpaperSheet";
import { useNav } from "@/lib/nav";
import { resetAll } from "@/lib/store";
import { DeleteDataSheet, EditProfileSheet, MinorGateSheet, OutOfMinutesSheet, ReportSheet, SafetySheet } from "@/sheets/SmallSheets";

export function SheetHost(): React.JSX.Element | null {
  const nav = useNav();
  const sheet = nav.sheet;
  if (!sheet) return null;
  let content: ReactNode = null;
  let title = "Cookie";
  let subtitle: string | undefined;
  let tall = false;
  switch (sheet.name) {
    case "paywall": title = "Plans & minutes"; subtitle = "A little more room for conversation"; tall = true; content = <PaywallSheet />; break;
    case "character": title = ""; content = <CharacterSheet characterId={sheet.characterId} />; tall = true; break;
    case "memory": title = "Memory"; subtitle = "The little things they keep"; content = <MemorySheet characterId={sheet.characterId} />; break;
    case "wallpaper": title = "Wallpaper"; subtitle = "Set the mood"; content = <WallpaperSheet characterId={sheet.characterId} />; break;
    case "report": title = "Report"; content = <ReportSheet characterId={sheet.characterId} />; break;
    case "callSummary": title = "Call summary"; content = <CallSummarySheet logId={sheet.logId} />; break;
    case "outOfMinutes": title = "Call minutes"; content = <OutOfMinutesSheet />; break;
    case "deleteData": title = "Delete data"; content = <DeleteDataSheet />; break;
    case "minorGate": title = "A note about age"; content = <MinorGateSheet />; break;
    case "safety": title = "Support & resources"; subtitle = "Real people, real help"; tall = true; content = <SafetySheet />; break;
    case "editProfile": title = "Your profile"; subtitle = "Make this space yours"; content = <EditProfileSheet />; break;
  }
  const close = () => {
    if (sheet.name === "minorGate") { resetAll(); nav.setTab("chats"); }
    nav.closeSheet();
  };
  return <Sheet open onClose={close} title={title} subtitle={subtitle} tall={tall}>{content}</Sheet>;
}
