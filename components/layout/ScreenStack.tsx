"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Route } from "@/lib/nav";

export function ScreenStack({ stack, render, onBack }: { stack: Route[]; render(r: Route): ReactNode; onBack(): void }): React.JSX.Element | null {
  const start = useRef<number | null>(null);
  const route = stack.at(-1);
  if (!route) return null;
  const key = route.name === "chat" ? `chat-${route.characterId}` : "create";
  return <div className="absolute inset-0 z-20 overflow-hidden">
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={key} className="absolute inset-0 bg-cream/70" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} onPointerDown={(event) => { start.current = event.clientX <= 28 ? event.clientX : null; }} onPointerUp={(event) => { if (start.current !== null && event.clientX - start.current > 100) onBack(); start.current = null; }} onPointerCancel={() => { start.current = null; }}>
        {render(route)}
      </motion.div>
    </AnimatePresence>
  </div>;
}
