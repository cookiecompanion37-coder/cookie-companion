"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { BrandLockup } from "@/components/ui/Cookie";

export function CookieLoader({ onDone }: { onDone(): void }): React.JSX.Element {
  useEffect(() => { const timer = window.setTimeout(onDone, 1100); return () => window.clearTimeout(timer); }, [onDone]);
  return <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}><BrandLockup height={220}/></motion.div>
    <p className="mt-4 text-sm font-semibold text-choc-soft">Preheating the oven…</p>
    <div className="mt-5 h-2 w-36 overflow-hidden rounded-full bg-white/70 shadow-inner"><motion.div className="h-full rounded-full [background:linear-gradient(90deg,#ffb7d9,#c9b6ff,#a9c6ff)]" initial={{ width: "12%" }} animate={{ width: "100%" }} transition={{ duration: 1.05, ease: "easeInOut" }}/></div>
  </motion.div>;
}
