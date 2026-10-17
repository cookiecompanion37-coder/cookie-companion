"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Cookie } from "@/components/ui/Cookie";

export function Bake({ name, onDone }: { name: string; onDone(): void }): React.JSX.Element {
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => { const timer = window.setTimeout(() => doneRef.current(), 3000); return () => window.clearTimeout(timer); }, []);
  return <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><div className="relative"><motion.div animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }} transition={{ duration: 1.3, repeat: Infinity }}><Cookie size={152} mood="happy" bites={2}/></motion.div><span className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl" style={{ animation: "steam 1.6s ease-in-out infinite" }}>♨</span></div><h2 className="mt-4 font-display text-2xl font-bold text-choc">Baking {name}…</h2><p className="mt-2 text-sm text-choc-soft">A little warmth, a little wonder.</p><div className="mt-6 flex gap-2">{[0, 1, 2].map((index) => <motion.span key={index} className="h-2.5 w-2.5 rounded-full [background:linear-gradient(135deg,#ffb7d9,#c9b6ff)]" animate={{ y: [0, -5, 0], opacity: [.4, 1, .4] }} transition={{ duration: .8, delay: index * .18, repeat: Infinity }}/>)}</div></div>;
}
