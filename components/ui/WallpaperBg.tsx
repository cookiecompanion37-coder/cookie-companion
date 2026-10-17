import { wallClass, type Wallpaper } from "@/lib/theme";
import type { WallpaperId } from "@/lib/types";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Applies a wallpaper palette + decorative aura to a screen. */
export function WScreen({ id, children, className }: { id?: WallpaperId; children: ReactNode; className?: string }): React.JSX.Element {
  return (
    <div className={cn("wscreen", wallClass(id), className)}>
      <div className="aura" aria-hidden="true"><span /><span /><span /></div>
      <div className="grain" aria-hidden="true" />
      {children}
    </div>
  );
}

export function WallpaperSwatch({ wallpaper, size = 54 }: { wallpaper: Wallpaper; size?: number }): React.JSX.Element {
  return (
    <span
      className="relative block overflow-hidden rounded-[18px] border border-white/70"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${wallpaper.swatch[0]} 0%, ${wallpaper.swatch[1]} 55%, ${wallpaper.swatch[2]} 100%)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.8), 0 8px 16px -12px rgba(90,20,50,.5)",
      }}
    >
      <span className="absolute inset-x-1 bottom-1 h-2 rounded-full bg-white/45" />
      <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white/60 blur-[2px]" />
    </span>
  );
}
