import { cn } from "@/lib/utils";

export function Waveform({ bars = 22, progress = 0, live = false, seed = 1, tint = "candy" }: { bars?: number; progress?: number; live?: boolean; seed?: number; tint?: "candy" | "light" }): React.JSX.Element {
  const count = Math.min(48, Math.max(6, bars));
  return (
    <span className="flex h-7 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const wave = 0.2 + Math.abs(Math.sin((index + 1) * seed * 0.71) * Math.cos(index * 0.23)) * 0.8;
        const filled = index / count < progress;
        return (
          <span
            key={index}
            className={cn("min-w-[2px] flex-1 rounded-full transition-colors", live && "animate-pulse")}
            style={{
              height: `${Math.max(16, wave * 100)}%`,
              backgroundColor: filled ? (tint === "light" ? "#ffffff" : "#f5286e") : tint === "light" ? "rgba(255,255,255,.35)" : "rgba(120,60,80,.22)",
              animationDelay: `${(index % 8) * 60}ms`,
            }}
          />
        );
      })}
    </span>
  );
}
