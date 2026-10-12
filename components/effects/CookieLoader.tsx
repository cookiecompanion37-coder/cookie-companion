"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Cookie, Wordmark } from "@/components/ui/Cookie";

export function CookieLoader({ onDone }: { onDone(): void }): React.JSX.Element {
  useEffect(() => { const timer = window.setTimeout(onDone, 1100); return () => window.clearTimeout(timer); }, [onDone]);
  return <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div animate={{ y: [0, -9, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}><Cookie size={142} mood="wave" bites={2}/></motion.div>
    <div className="mt-3"><Wordmark size={45}/></div><p className="mt-3 text-sm font-semibold text-choc-soft">Preheating the oven…</p>
    <div className="mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-biscuit/20"><motion.div className="h-full rounded-full bg-biscuit" initial={{ width: "12%" }} animate={{ width: "100%" }} transition={{ duration: 1.05, ease: "easeInOut" }}/></div>
  </motion.div>;
}
