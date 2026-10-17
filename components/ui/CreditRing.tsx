"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function CreditRing({ value, icon, label, onClick }: { value: number; icon: ReactNode; label: string; onClick?(): void }): React.JSX.Element {
  const uid = useId().replaceAll(":", "");
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, value));
  const content = (
    <span className="relative grid h-[56px] w-[56px] place-items-center" aria-label={`${label}: ${Math.round(progress * 100)}% remaining`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#ff8fb3" />
            <stop offset="1" stopColor="#f5286e" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="3.6" />
        <motion.circle cx="24" cy="24" r={radius} fill="none" stroke={`url(#${uid})`} strokeWidth="3.6" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - progress) }} transition={{ duration: 0.7 }} />
      </svg>
      <span className="grid place-items-center text-[#c60f4d]">{icon}</span>
      <span className="absolute -bottom-0.5 rounded-full bg-white/85 px-1.5 text-[9px] font-bold text-[#7a2b45] shadow-sm">{label}</span>
    </span>
  );
  if (!onClick) return content;
  return <button type="button" className="press rounded-full" onClick={onClick}>{content}</button>;
}
