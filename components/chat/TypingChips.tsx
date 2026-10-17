import { cn } from "@/lib/utils";

export function TypingChips({ accent }: { accent: string }): React.JSX.Element {
  return (
    <div aria-label="Companion is typing" className="bubble-ai flex w-fit items-center gap-1.5 rounded-[18px] rounded-bl-[7px] px-4 py-3">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className={cn("typing-dot h-1.5 w-1.5 rounded-full")} style={{ backgroundColor: accent, animationDelay: `${dot * 140}ms` }} />
      ))}
    </div>
  );
}
