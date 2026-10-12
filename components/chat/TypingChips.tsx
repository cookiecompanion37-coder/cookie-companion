import { cn } from "@/lib/utils";

export function TypingChips({ accent }: { accent: string }): React.JSX.Element {
  return <div aria-label="Companion is typing" className="clay flex w-fit items-center gap-1.5 rounded-[18px] px-4 py-3">
    {[0, 1, 2].map((dot) => <span key={dot} className={cn("h-2 w-2 rounded-full animate-bounce")} style={{ backgroundColor: accent, animationDelay: `${dot * 120}ms` }} />)}
  </div>;
}
