"use client";

import { useId } from "react";
import { motion } from "framer-motion";

export function CreditRing({ value, icon, label, onClick }: { value: number; icon: string; label: string; onClick?(): void }): React.JSX.Element {
  const uid = useId().replaceAll(":", "");
  const radius = 19; const circumference = 2 * Math.PI * radius; const progress = Math.min(1, Math.max(0, value));
  const content = <span className="relative grid h-[62px] w-[62px] place-items-center" aria-label={`${label}: ${Math.round(progress * 100)}% remaining`}>
    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
      <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFB7D9" /><stop offset="1" stopColor="#A9C6FF" /></linearGradient></defs>
      <circle cx="24" cy="24" r={radius} fill="none" stroke="#F3E6D5" strokeWidth="4" />
      <motion.circle cx="24" cy="24" r={radius} fill="none" stroke={`url(#${uid})`} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - progress) }} transition={{ duration: .6 }} />
    </svg>
    <span className="text-[19px]">{icon}</span><span className="absolute -bottom-1 rounded-full bg-cream/95 px-1.5 text-[10px] font-bold text-choc-soft shadow-sm">{label}</span>
  </span>;
  if (!onClick) return content;
  return <button type="button" className="min-h-11 min-w-11 rounded-2xl transition-transform active:scale-95" onClick={onClick}>{content}</button>;
}
