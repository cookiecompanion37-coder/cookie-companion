"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  tall = false,
  children,
}: {
  open: boolean;
  onClose(): void;
  title?: string;
  subtitle?: string;
  tall?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const controls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-[58] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close sheet" className="absolute inset-0 bg-[#2b0d16]/35 backdrop-blur-[3px]" onClick={onClose} />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Details"}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 650) onClose(); }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-t-[34px] border-t border-white/70 shadow-[0_-20px_60px_-30px_rgba(60,10,30,.6)]",
              tall ? "max-h-[94%]" : "max-h-[86%]",
            )}
            style={{ background: "var(--surface-solid)", color: "var(--ink)" }}
          >
            <div className="shrink-0 px-5 pt-2.5" onPointerDown={(event) => controls.start(event)}>
              <div className="mx-auto h-1.5 w-11 rounded-full bg-[linear-gradient(90deg,#ffb4cb,#f5286e_60%,#c9b4ff)]" />
              <div className="mt-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {title && <h2 className="truncate font-display text-[21px] font-semibold leading-tight">{title}</h2>}
                  {subtitle && <p className="mt-0.5 truncate text-[12px] text-[color:var(--ink-soft)]">{subtitle}</p>}
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--ink-soft)]">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="no-scrollbar overflow-y-auto px-5 pb-[max(26px,env(safe-area-inset-bottom))] pt-4">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
