"use client";

import { motion } from "framer-motion";
import { REACTIONS } from "@/lib/constants";
import type { Reaction } from "@/lib/types";

export function ReactionTray({ anchor, mine, onPick, onClose }: { anchor: DOMRect; mine: Reaction | undefined; onPick(e: Reaction): void; onClose(): void }): React.JSX.Element {
  const center = anchor.left + anchor.width / 2;
  const left = `min(max(10px, calc(${center}px - 138px)), calc(100% - 288px))`;
  const top = Math.max(12, anchor.top - 56);
  return (
    <div className="absolute inset-0 z-40" onPointerDown={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
        onPointerDown={(event) => event.stopPropagation()}
        className="glass absolute flex items-center gap-0.5 rounded-full p-1.5"
        style={{ left, top }}
      >
        {REACTIONS.map((reaction) => (
          <button key={reaction} type="button" aria-label={`React ${reaction}`} onClick={() => onPick(reaction)} className={`press grid h-10 w-10 place-items-center rounded-full text-[20px] ${mine === reaction ? "bg-white/80" : ""}`}>{reaction}</button>
        ))}
      </motion.div>
    </div>
  );
}
