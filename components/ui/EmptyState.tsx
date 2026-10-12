import type { ReactNode } from "react";
import { Cookie } from "@/components/ui/Cookie";

export function EmptyState({ mood, title, body, action }: { mood: "wave" | "happy" | "sad" | "sleep" | "crumbled" | "blush"; title: string; body?: string; action?: ReactNode }): React.JSX.Element {
  return <div className="crumple flex min-h-[300px] flex-col items-center justify-center rounded-[32px] px-8 py-10 text-center"><Cookie size={118} mood={mood} bites={mood === "crumbled" ? 5 : 2}/><h2 className="mt-4 font-display text-2xl font-bold text-choc">{title}</h2>{body && <p className="mt-2 max-w-xs text-sm leading-relaxed text-choc-soft">{body}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
export function Skeleton({ className = "" }: { className?: string }): React.JSX.Element {
  return <div aria-hidden="true" className={`shimmer rounded-[22px] ${className}`} />;
}
