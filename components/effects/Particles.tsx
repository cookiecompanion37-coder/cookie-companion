"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { uid } from "@/lib/utils";

type FxKind = "poof" | "burst" | "confetti" | "tap";
type FxDetail = { kind: FxKind; x: number; y: number; emoji?: string };
type Particle = FxDetail & { id: string; dx: number; dy: number; rot: number };
function dispatch(detail: FxDetail): void { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<FxDetail>("cookie:fx", { detail })); }
export const fx = {
  poof(x: number, y: number): void { dispatch({ kind: "poof", x, y }); },
  burst(x: number, y: number, emoji: string): void { dispatch({ kind: "burst", x, y, emoji }); },
  confetti(x: number, y: number): void { dispatch({ kind: "confetti", x, y }); },
};

type ParticleStyle = CSSProperties & { "--dx": string; "--dy": string; "--rot": string };
export function FxHost(): React.JSX.Element {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const onFx = (event: Event) => {
      const custom = event as CustomEvent<FxDetail>;
      const detail = custom.detail;
      if (!detail || document.documentElement.dataset.reduce === "1") return;
      const count = detail.kind === "burst" ? 7 : detail.kind === "confetti" ? 12 : 5;
      const next = Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const distance = 24 + Math.random() * 42;
        return { ...detail, id: uid(), dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance - 12, rot: Math.random() * 110 - 55 };
      });
      setParticles((current) => [...current.slice(-40), ...next]);
    };
    const onPointer = (event: PointerEvent) => {
      if (document.documentElement.dataset.reduce === "1") return;
      if (!(event.target instanceof Element) || !event.target.closest("button,[role='button']")) return;
      const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
      dispatch({ kind: "tap", x: event.clientX - (shell?.left ?? 0), y: event.clientY - (shell?.top ?? 0) });
    };
    window.addEventListener("cookie:fx", onFx); document.addEventListener("pointerdown", onPointer);
    return () => { window.removeEventListener("cookie:fx", onFx); document.removeEventListener("pointerdown", onPointer); };
  }, []);
  const symbol = (item: Particle, index: number) => item.kind === "burst" ? item.emoji : item.kind === "confetti" ? ["✦", "•", "♥", "✧"][index % 4] : item.kind === "tap" ? "✦" : ["🍪", "✦", "•"][index % 3];
  return <div aria-hidden="true" className="cookie-fx-layer pointer-events-none absolute inset-0 z-[90] overflow-hidden">{particles.map((item, index) => {
    const style: ParticleStyle = { left: item.x, top: item.y, "--dx": `${item.dx}px`, "--dy": `${item.dy}px`, "--rot": `${item.rot}deg`, animation: `${item.kind === "tap" ? "crumb-fly 500ms ease-out forwards" : "crumb-fly 850ms cubic-bezier(.2,.7,.2,1) forwards"}` };
    return <span key={item.id} className="absolute text-lg" style={style} onAnimationEnd={() => setParticles((current) => current.filter((entry) => entry.id !== item.id))}>{symbol(item, index)}</span>;
  })}</div>;
}
