import type { ReactNode } from "react";
import { Cookie } from "@/components/ui/Cookie";

export function EmptyState({ mood, title, body, action, compact = false }: { mood: "wave" | "happy" | "sad" | "sleep" | "crumbled" | "blush"; title: string; body?: string; action?: ReactNode; compact?: boolean }): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "py-8" : "min-h-[300px] py-12"}`}>
      <div className="relative grid h-[118px] w-[118px] place-items-center rounded-[38px] [background:linear-gradient(150deg,#fff6ec,#ffe1ec_55%,#efe4ff)] shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_22px_44px_-24px_rgba(206,115,172,.7)]">
        <Cookie size={84} mood={mood} bites={mood === "crumbled" ? 5 : 2} />
        <span className="absolute -right-2 -top-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#c60f4d] shadow-sm">AI</span>
      </div>
      <h2 className="mt-5 font-display text-[22px] font-semibold leading-tight">{title}</h2>
      {body && <p className="mt-1.5 max-w-[270px] text-[13px] leading-relaxed text-[color:var(--ink-soft)]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return <div aria-hidden="true" className={`shimmer rounded-[24px] bg-white/40 ${className}`} />;
}
