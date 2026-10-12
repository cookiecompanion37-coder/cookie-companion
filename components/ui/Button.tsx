import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "clay" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; full?: boolean };
export function Button({ variant = "gold", size = "md", full = false, className, onClick, ...props }: ButtonProps): React.JSX.Element {
  const variants = { gold: "clay-gold", clay: "clay text-choc", ghost: "bg-transparent text-choc-soft hover:bg-white/45", danger: "bg-danger text-white shadow-lg shadow-danger/20" };
  const sizes = { sm: "min-h-11 px-4 text-sm", md: "min-h-12 px-5 text-base", lg: "min-h-14 px-6 text-lg" };
  return <button {...props} className={cn("inline-flex items-center justify-center gap-2 rounded-[20px] font-display font-semibold transition-transform active:scale-[.97] disabled:opacity-50", variants[variant], sizes[size], full && "w-full", className)} onClick={(event) => { haptic("tap"); onClick?.(event); }} />;
}

export function Chip({ selected = false, onClick, children, size = "md" }: { selected?: boolean; onClick?(): void; children: ReactNode; size?: "sm" | "md" }): React.JSX.Element {
  const padding = size === "sm" ? "min-h-11 px-3 text-xs" : "min-h-11 px-4 text-sm";
  return <button type="button" onClick={() => { haptic("tap"); onClick?.(); }} className={cn("rounded-full border font-semibold transition-all", padding, selected ? "border-choc bg-choc text-cream shadow-md" : "border-white/70 bg-white/65 text-choc-soft hover:bg-white")}>{children}</button>;
}
