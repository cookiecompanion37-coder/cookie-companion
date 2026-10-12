"use client";

import { motion } from "framer-motion";
import { REACTIONS } from "@/lib/constants";
import type { Reaction } from "@/lib/types";

export function ReactionTray({ anchor, mine, onPick, onClose }: { anchor: DOMRect; mine: Reaction | undefined; onPick(e: Reaction): void; onClose(): void }): React.JSX.Element {
  const center = anchor.left + anchor.width / 2;
  const left = `min(max(8px, calc(${center}px - 140px)), calc(100% - 292px))`;
  const top = Math.max(12, anchor.top - 58);
  return <div className="absolute inset-0 z-40" onPointerDown={onClose}>
    <motion.div initial={{ opacity: 0, scale: .86, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .9 }} transition={{ type: "spring", stiffness: 380, damping: 25 }} onPointerDown={(event) => event.stopPropagation()} className="glass absolute flex items-center gap-1 rounded-full p-1.5 shadow-xl" style={{ left, top }}>
      {REACTIONS.map((reaction) => <button key={reaction} type="button" aria-label={`React ${reaction}`} onClick={() => onPick(reaction)} className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform active:scale-75 ${mine === reaction ? "bg-biscuit/35" : "hover:bg-white/70"}`}>{reaction}</button>)}
    </motion.div>
  </div>;
}
