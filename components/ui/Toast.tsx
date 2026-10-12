"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type ToastValue = { toast(message: string, icon?: string): void };
const ToastContext = createContext<ToastValue | null>(null);
type ToastMessage = { id: number; message: string; icon: string };
export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [item, setItem] = useState<ToastMessage | null>(null);
  const toast = useCallback((message: string, icon = "🍪") => setItem({ id: Date.now(), message, icon }), []);
  useEffect(() => { if (!item) return; const timer = window.setTimeout(() => setItem(null), 2500); return () => window.clearTimeout(timer); }, [item]);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(16px,env(safe-area-inset-top))]"><AnimatePresence>{item && <motion.div key={item.id} initial={{ y: -28, opacity: 0, scale: .96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className="glass flex max-w-full items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-choc shadow-lg"><span>{item.icon}</span><span>{item.message}</span></motion.div>}</AnimatePresence></div></ToastContext.Provider>;
}
export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
