import type { ReactNode } from "react";
import { Cookie } from "@/components/ui/Cookie";

export function EmptyState({ mood, title, body, action }: { mood: "wave" | "happy" | "sad" | "sleep" | "crumbled" | "blush"; title: string; body?: string; action?: ReactNode }): React.JSX.Element {
  return <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
    <div className="grid h-[136px] w-[136px] place-items-center rounded-[40px] shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_20px_40px_-22px_rgba(206,115,172,.55)] [background:linear-gradient(150deg,#fff3de,#ffe1ee_55%,#e8ddff)]">
      <Cookie size={98} mood={mood} bites={mood === "crumbled" ? 5 : 2}/>
    </div>
    <h2 className="mt-5 font-display text-2xl font-bold text-choc">{title}</h2>
    {body && <p className="mt-2 max-w-xs text-sm leading-relaxed text-choc-soft">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
export function Skeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return <div aria-hidden="true" className={`shimmer rounded-[22px] ${className}`} />;
}
