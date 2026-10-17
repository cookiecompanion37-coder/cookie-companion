"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Bell, Cookie, Mic, Phone, ShieldCheck, Sparkles } from "lucide-react";

type ToastValue = { toast(message: string, icon?: string): void };
const ToastContext = createContext<ToastValue | null>(null);
type ToastMessage = { id: number; message: string; icon: string };
const ICONS: Record<string, typeof Bell> = { "🍪": Cookie, "📞": Phone, "✨": Sparkles, "🛡️": ShieldCheck, "🎙": Mic };
export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [item, setItem] = useState<ToastMessage | null>(null);
  const toast = useCallback((message: string, icon = "🍪") => setItem({ id: Date.now(), message, icon }), []);
  useEffect(() => { if (!item) return; const timer = window.setTimeout(() => setItem(null), 2600); return () => window.clearTimeout(timer); }, [item]);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <AnimatePresence>
          {item && (
            <motion.div
              key={item.id}
              initial={{ y: -30, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="glass flex max-w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-semibold"
            >
              {(() => { const Icon = ICONS[item.icon] ?? Bell; return <Icon size={15} className="shrink-0 text-[#c60f4d]" />; })()}
              <span className="truncate">{item.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
