"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type CookieMood = "wave" | "happy" | "sad" | "sleep" | "crumbled" | "blush";
export function Cookie({ size = 120, mood = "wave", bites = 1, className }: { size?: number; mood?: CookieMood; bites?: 0 | 1 | 2 | 3 | 4 | 5; className?: string }): React.JSX.Element {
  const uid = useId().replaceAll(":", "");
  const bodyId = `${uid}-body`;
  const biteId = `${uid}-bite`;
  const sleeping = mood === "sleep";
  const sad = mood === "sad";
  const raised = mood === "wave" || mood === "happy" || mood === "blush";
  const cracked = mood === "crumbled" || bites >= 4;
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className={cn("overflow-visible", mood === "wave" && "cookie-wave", className)} style={{ width: size, height: size }}>
      <defs>
        <radialGradient id={bodyId} cx=".38" cy=".3" r="1">
          <stop offset="0" stopColor="#FFE29B" />
          <stop offset=".62" stopColor="#F5BC58" />
          <stop offset="1" stopColor="#E09A33" />
        </radialGradient>
        <mask id={biteId}>
          <circle cx="60" cy="58" r="42" fill="#fff" />
          <circle cx="90" cy="17" r="15" fill="#000" />
        </mask>
      </defs>
      <ellipse cx="60" cy="106" rx="30" ry="5.5" fill="#B07A48" opacity=".16" />
      <g stroke="#7A4A2E" strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M26 68 Q17 76 19 87" />
        {raised
          ? <g className={mood === "wave" ? "cookie-hand" : undefined}><path d="M95 66 Q107 52 104 38" /><path d="M104 30 l3.5-8 M111 35 l7-3.5 M106.5 24 l-1.5-8" stroke="#F2B24C" strokeWidth="4.5" /></g>
          : <path d="M95 68 Q104 77 102 87" />}
      </g>
      <g fill="#7A4A2E">
        <rect x="42" y="91" width="13" height="17" rx="6.5" />
        <rect x="65" y="91" width="13" height="17" rx="6.5" />
      </g>
      <g mask={`url(#${biteId})`}>
        <circle cx="60" cy="58" r="42" fill={`url(#${bodyId})`} stroke="#DE9A33" strokeWidth="1.6" />
        <ellipse cx="43" cy="34" rx="23" ry="14" fill="#FFF2CD" opacity=".55" transform="rotate(-18 43 34)" />
        <ellipse cx="38" cy="40" rx="5.4" ry="4.6" fill="#6E4126" transform="rotate(-24 38 40)" />
        <ellipse cx="70" cy="30" rx="4.6" ry="4" fill="#6E4126" transform="rotate(18 70 30)" />
        <ellipse cx="84" cy="56" rx="5.6" ry="4.8" fill="#6E4126" transform="rotate(10 84 56)" />
        <ellipse cx="34" cy="68" rx="4.6" ry="4" fill="#6E4126" transform="rotate(-12 34 68)" />
        <ellipse cx="60" cy="88" rx="4.8" ry="4.2" fill="#6E4126" transform="rotate(8 60 88)" />
        {cracked && <g stroke="#C8811F" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M48 46 l7 9 -5 8" /><path d="M74 70 l6 7 -4 7" /></g>}
      </g>
      <path d="M75.1 18.8 A15 15 0 0 0 92.8 31.7" fill="none" stroke="#DE9A33" strokeWidth="1.6" />
      {sleeping
        ? <g stroke="#3A2317" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M40 55 q5 4 10 0" /><path d="M70 55 q5 4 10 0" /></g>
        : <g><ellipse cx="44" cy="53" rx="6" ry="7.2" fill="#3A2317" /><ellipse cx="76" cy="53" rx="6" ry="7.2" fill="#3A2317" /><circle cx="46.2" cy="50" r="2" fill="#fff" opacity=".95" /><circle cx="78.2" cy="50" r="2" fill="#fff" opacity=".95" /><circle cx="42" cy="56.5" r="1.1" fill="#fff" opacity=".6" /><circle cx="74" cy="56.5" r="1.1" fill="#fff" opacity=".6" /></g>}
      <g fill="#F4899B" opacity={mood === "blush" ? ".75" : ".5"}><ellipse cx="35" cy="65" rx="6.4" ry="3.6" /><ellipse cx="85" cy="65" rx="6.4" ry="3.6" /></g>
      {sad
        ? <path d="M52 79 q8 -7 16 0" fill="none" stroke="#5E3520" strokeWidth="2.6" strokeLinecap="round" />
        : sleeping
          ? <ellipse cx="60" cy="76" rx="3.6" ry="3" fill="#5E3520" />
          : <g><ellipse cx="60" cy="74" rx="7" ry="5.8" fill="#5E3520" /><ellipse cx="60" cy="77.6" rx="4.4" ry="2.8" fill="#F58FA0" /></g>}
      {sleeping && <g fill="#B49BEA" fontWeight="700"><text x="4" y="30" fontSize="14">z</text><text x="15" y="19" fontSize="10">z</text></g>}
    </svg>
  );
}

export function BrandLockup({ height = 210, float = false, className }: { height?: number; float?: boolean; className?: string }): React.JSX.Element {
  return <img src="/cookie-brand.png" alt="Cookie — AI Companion" draggable={false} className={cn("pointer-events-none select-none mix-blend-multiply", float && "animate-[float_4.5s_ease-in-out_infinite]", className)} style={{ height, width: "auto" }} />;
}

export function CookieMark({ size = 56, float = false, className }: { size?: number; float?: boolean; className?: string }): React.JSX.Element {
  return <img src="/cookie-logo.png" alt="Cookie" draggable={false} className={cn("pointer-events-none select-none", float && "animate-[float_4.5s_ease-in-out_infinite]", className)} style={{ width: size, height: size }} />;
}
