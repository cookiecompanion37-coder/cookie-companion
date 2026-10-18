import type { WallpaperId } from "@/lib/types";

export interface Wallpaper {
  id: WallpaperId;
  name: string;
  note: string;
  swatch: [string, string, string];
  dark?: boolean;
}

/** App + chat wallpapers. Rendered in CSS by the `wall-*` class on a screen. */
export const WALLPAPERS: Wallpaper[] = [
  { id: "sakura", name: "Sakura", note: "the brand blush", swatch: ["#ffd8e4", "#ffb6cd", "#fec077"] },
  { id: "cotton", name: "Cotton", note: "soft cream daylight", swatch: ["#fff6ef", "#ffdbe7", "#e7d6ff"] },
  { id: "dusk", name: "Dusk", note: "lilac evening glow", swatch: ["#eddfff", "#ffc9df", "#ffb690"] },
  { id: "matcha", name: "Matcha", note: "calm green tea", swatch: ["#eef9ea", "#cdeed6", "#ffd2e1"] },
  { id: "peach", name: "Peach", note: "warm sunset", swatch: ["#fff0e2", "#ffcab0", "#ff9fc2"] },
  { id: "midnight", name: "Midnight", note: "deep cozy dark", swatch: ["#2a0d22", "#4a1236", "#6d1a45"], dark: true },
];

export const DEFAULT_WALLPAPER: WallpaperId = "sakura";

export function wallClass(id: WallpaperId | undefined): string {
  return `wall-${id && WALLPAPERS.some((entry) => entry.id === id) ? id : DEFAULT_WALLPAPER}`;
}

export function wallpaper(id: WallpaperId | undefined): Wallpaper {
  return WALLPAPERS.find((entry) => entry.id === id) ?? WALLPAPERS[0]!;
}

export function swatchGradient(w: Wallpaper): string {
  return `linear-gradient(150deg, ${w.swatch[0]} 0%, ${w.swatch[1]} 55%, ${w.swatch[2]} 100%)`;
}
