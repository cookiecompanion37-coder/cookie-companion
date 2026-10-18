"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { BrandLockup } from "@/components/ui/Cookie";

export function CookieLoader({ onDone }: { onDone(): void }): React.JSX.Element {
  useEffect(() => { onDone(); }, [onDone]);
  return (
    <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#ffe9f0]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="aura" aria-hidden="true"><span /><span /><span /></div>
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <BrandLockup height={190} />
      </motion.div>
      <p className="relative mt-5 font-display text-[13px] font-semibold tracking-wide text-[#a33b5e]">warming up the oven…</p>
      <div className="relative mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-white/70 shadow-inner">
        <motion.div className="h-full rounded-full brand-gradient" initial={{ width: "14%" }} animate={{ width: "100%" }} transition={{ duration: 1, ease: "easeInOut" }} />
      </div>
    </motion.div>
  );
}
