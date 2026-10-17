import { cn } from "@/lib/utils";

export function Waveform({ bars = 24, progress = 0, live = false, seed = 1 }: { bars?: number; progress?: number; live?: boolean; seed?: number }): React.JSX.Element {
  const count = Math.min(48, Math.max(6, bars));
  return <span className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden="true">{Array.from({ length: count }, (_, index) => {
    const wave = .18 + Math.abs(Math.sin((index + 1) * seed * .71) * Math.cos(index * .23)) * .82;
    return <span key={index} className={cn("min-w-[2px] flex-1 rounded-full", index / count < progress ? "bg-berry" : "bg-choc/20", live && "animate-pulse")} style={{ height: `${Math.max(16, wave * 100)}%`, animationDelay: `${(index % 8) * 65}ms` }} />;
  })}</span>;
}
