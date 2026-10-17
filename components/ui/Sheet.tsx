"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { ReactNode } from "react";

export function Sheet({ open, onClose, title, tall = false, children }: { open: boolean; onClose(): void; title?: string; tall?: boolean; children: ReactNode }): React.JSX.Element {
  const controls = useDragControls();
  return <AnimatePresence>
    {open && <motion.div className="absolute inset-0 z-[58] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close sheet" className="absolute inset-0 bg-choc/20 backdrop-blur-[3px]" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-label={title ?? "Details"} drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={.16} onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 30 }} className={`relative flex w-full flex-col rounded-t-[34px] border-t border-white/80 bg-[linear-gradient(180deg,#fffdf9,#fff8ec)] shadow-2xl shadow-choc/20 ${tall ? "max-h-[94%]" : "max-h-[84%]"}`}>
        <div className="shrink-0 px-5 pt-3" onPointerDown={(event) => controls.start(event)}><div className="mx-auto h-1.5 w-11 rounded-full bg-[linear-gradient(90deg,#ffd9a6,#ffb3d1_50%,#c9b0ff)]" />{title && <h2 className="mt-4 font-display text-xl font-bold text-choc">{title}</h2>}</div>
        <div className="no-scrollbar overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">{children}</div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
