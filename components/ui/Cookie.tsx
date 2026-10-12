"use client";

import { useId } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type CookieMood = "wave" | "happy" | "sad" | "sleep" | "crumbled" | "blush";
export function Cookie({ size = 120, mood = "wave", bites = 1, className }: { size?: number; mood?: CookieMood; bites?: 0 | 1 | 2 | 3 | 4 | 5; className?: string }): React.JSX.Element {
  const id = useId().replaceAll(":", "");
  const fillId = `${id}-cookie-fill`;
  const glossId = `${id}-cookie-gloss`;
  const shadowId = `${id}-cookie-shadow`;
  const style: CSSProperties = { width: size, height: size };
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className={cn("overflow-visible", className)} style={style}>
      <defs>
        <linearGradient id={fillId} x1=".2" y1="0" x2=".8" y2="1"><stop stopColor="#FFD987"/><stop offset="1" stopColor="#EAA23E"/></linearGradient>
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#FFF6DB" stopOpacity=".85"/><stop offset="1" stopColor="#FFF6DB" stopOpacity="0"/></linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#9D5B23" floodOpacity=".25"/></filter>
      </defs>
      <ellipse cx="59" cy="108" rx="32" ry="6" fill="#9D6B3D" opacity=".12"/>
      <g className={mood === "wave" ? "cookie-wave" : undefined} filter={`url(#${shadowId})`}>
        <path d="M18 59c0-23 18-42 42-42 8 0 16 2 22 7-5 7-3 15 4 19 8 4 14 1 19-5 5 8 7 16 6 25-2 22-21 39-45 39H58C35 102 18 83 18 59Z" fill={`url(#${fillId})`} stroke="#D9902B" strokeWidth="2"/>
        <path d="M26 52c3-17 18-29 35-30 8 0 14 2 19 5-3 7-1 14 5 18-12 1-21 10-22 22-11-8-25-4-31 4-5-4-8-11-6-19Z" fill={`url(#${glossId})`} opacity=".56"/>
        {Array.from({ length: bites }, (_, index) => <circle key={`bite-${index}`} cx={88 + (index % 2) * 8} cy={23 + index * 8} r="3.3" fill="#FFF8EC" opacity=".72"/>)}
        <ellipse cx="45" cy="61" rx="3.2" ry={mood === "sleep" ? 1 : 4} fill="#4A2C1A"/>
        <ellipse cx="70" cy="61" rx="3.2" ry={mood === "sleep" ? 1 : 4} fill="#4A2C1A"/>
        <path d={mood === "sad" ? "M49 78q9-9 18 0" : mood === "sleep" ? "M50 77h7m8 0h7" : "M49 73q9 12 18 0"} fill="none" stroke="#754322" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="35" cy="71" rx="6" ry="3" fill="#ED8491" opacity={mood === "blush" ? ".9" : ".48"}/><ellipse cx="80" cy="71" rx="6" ry="3" fill="#ED8491" opacity={mood === "blush" ? ".9" : ".48"}/>
        <circle cx="35" cy="42" r="4" fill="#62391F"/><circle cx="82" cy="48" r="3.4" fill="#62391F"/><circle cx="61" cy="88" r="3.6" fill="#62391F"/>
        <path d="M27 83q-8 8-4 17m65-13q7 7 3 14" fill="none" stroke="#D9902B" strokeWidth="5" strokeLinecap="round"/>
        {mood === "wave" && <g className="cookie-hand"><path d="M96 74q12-11 14-23" fill="none" stroke="#D9902B" strokeWidth="7" strokeLinecap="round"/><path d="m108 52 4-11m-8 10-2-11m10 13 7-7" fill="none" stroke="#EAA23E" strokeWidth="4" strokeLinecap="round"/></g>}
      </g>
    </svg>
  );
}

export function Wordmark({ size = 52 }: { size?: number }): React.JSX.Element {
  return <span className="relative inline-flex items-center font-display font-bold leading-none tracking-tight" style={{ fontSize: size }}><span className="grad-text">cookie</span><span aria-hidden="true" className="absolute text-pink" style={{ fontSize: size * .28, left: "68%", top: -size * .1 }}>♥</span></span>;
}
