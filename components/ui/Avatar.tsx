"use client";

import { useState } from "react";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Look = Pick<Character, "name" | "emoji" | "accent" | "photo">;

export function Avatar({
  character,
  size = 56,
  shape = "squircle",
  online = false,
  busy = false,
  ring = true,
  className,
}: {
  character: Look;
  size?: number;
  shape?: "squircle" | "circle";
  online?: boolean;
  busy?: boolean;
  ring?: boolean;
  className?: string;
}): React.JSX.Element {
  const [broken, setBroken] = useState(false);
  const radius = shape === "circle" ? "999px" : `${Math.round(size * 0.34)}px`;
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          background: ring ? `linear-gradient(145deg, ${character.accent} 0%, #fff0f5 60%, #ffd2e1 100%)` : "transparent",
          padding: ring ? 2 : 0,
          boxShadow: ring ? "0 8px 20px -12px rgba(160, 20, 70, .55)" : undefined,
        }}
      />
      <span
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={{
          borderRadius: `calc(${radius} - ${ring ? 2 : 0}px)`,
          margin: ring ? 2 : 0,
          width: ring ? `calc(100% - 4px)` : "100%",
          height: ring ? `calc(100% - 4px)` : "100%",
          background: `linear-gradient(150deg, ${character.accent}66, #fff6f2)`,
          border: "1px solid rgba(255,255,255,.8)",
        }}
      >
        {character.photo && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.photo}
            alt={character.name}
            draggable={false}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
            style={{ borderRadius: `calc(${radius} - 3px)` }}
          />
        ) : (
          <span aria-hidden="true" className="font-display font-bold text-white/95 drop-shadow-sm" style={{ fontSize: Math.round(size * 0.44) }}>{character.emoji || character.name.trim().slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      {online && (
        <span aria-label="online" className="absolute bottom-0 right-0 grid place-items-center rounded-full border-2 border-[#ffedf1] bg-[#45b98a]" style={{ width: Math.max(12, size * 0.24), height: Math.max(12, size * 0.24) }}>
          <span className="h-1 w-1 rounded-full bg-white/90" />
        </span>
      )}
      {busy && <span aria-label="busy" className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[#ffedf1] bg-[#f6c453]" />}
    </span>
  );
}

export function UserAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }): React.JSX.Element {
  const initial = (name.trim()[0] ?? "C").toUpperCase();
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden font-display font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        fontSize: size * 0.4,
        background: "linear-gradient(145deg, #ff9fc0 0%, #f5286e 60%, #c60f4d 100%)",
        boxShadow: "0 8px 18px -10px rgba(198,15,77,.7), inset 0 1px 0 rgba(255,255,255,.4)",
      }}
    >
      <span className="absolute -right-1 -top-2 h-5 w-5 rounded-full bg-white/20" />
      {initial}
    </span>
  );
}
