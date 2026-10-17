"use client";

import { Check } from "lucide-react";
import { WALLPAPERS, swatchGradient } from "@/lib/theme";
import type { WallpaperId } from "@/lib/types";

export function WallpaperPicker({ value, onPick }: { value: WallpaperId | undefined; onPick(id: WallpaperId): void }): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {WALLPAPERS.map((wallpaper) => {
        const active = value === wallpaper.id;
        return (
          <button key={wallpaper.id} type="button" onClick={() => onPick(wallpaper.id)} className={`press relative overflow-hidden rounded-[18px] border text-left transition-all ${active ? "border-[#f5286e] shadow-[0_14px_24px_-16px_rgba(214,18,83,.8)]" : "border-white/70"}`}>
            <span className="relative block h-[66px] w-full" style={{ background: swatchGradient(wallpaper) }}>
              <span className="absolute inset-x-2 top-2 h-2 rounded-full bg-white/40" />
              <span className="absolute inset-x-2 bottom-2 h-4 rounded-full bg-white/55" />
              {active && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full brand-gradient text-white"><Check size={11} /></span>}
            </span>
            <span className="block px-2 py-1.5">
              <strong className="block text-[10.5px] font-bold leading-tight">{wallpaper.name}</strong>
              <small className="block truncate text-[8.5px] text-[color:var(--ink-soft)]">{wallpaper.note}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
