"use client";

import { Palette } from "lucide-react";
import { useNav } from "@/lib/nav";
import { useAppState, setState } from "@/lib/store";
import { findCharacter } from "@/lib/engine/engineUtils";
import { WallpaperPicker } from "@/components/profile/WallpaperPicker";
import type { WallpaperId } from "@/lib/types";

export function WallpaperSheet({ characterId }: { characterId?: string }): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const character = characterId ? findCharacter(state, characterId) : undefined;
  const current = characterId
    ? state.characterWallpapers[characterId] ?? character?.wallpaper ?? state.wallpaper
    : state.wallpaper;
  const pick = (id: WallpaperId) => {
    if (characterId) {
      setState((s) => ({ ...s, characterWallpapers: { ...s.characterWallpapers, [characterId]: id } }));
      nav.closeSheet();
      return;
    }
    setState((s) => ({ ...s, wallpaper: id }));
  };
  return (
    <div className="pb-2">
      <div className="flex items-center gap-2 rounded-[18px] bg-[#fff0f4] px-3 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/70 text-[#c60f4d]"><Palette size={14} /></span>
        <p className="text-[11px] leading-snug text-[#7d4a5d]">
          {character ? <>This wallpaper is just for your chats with <strong>{character.name}</strong>.</> : "Set the mood for every screen. Each companion can still have their own."}
        </p>
      </div>
      <div className="mt-4">
        <WallpaperPicker value={current} onPick={pick} />
      </div>
      <p className="mt-3 text-center text-[9.5px] text-[#8a596b]">Wallpapers are made of light, not data — they cost nothing to switch.</p>
    </div>
  );
}
