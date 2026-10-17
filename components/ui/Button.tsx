import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "candy" | "soft" | "ghost" | "dark" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
};
export function Button({ variant = "candy", size = "md", full = false, className, onClick, ...props }: ButtonProps): React.JSX.Element {
  const variants = {
    candy: "text-white brand-gradient border border-white/25 shadow-[0_14px_30px_-14px_rgba(214,18,83,.75)] hover:brightness-105",
    soft: "card text-ink border border-white/80",
    ghost: "bg-transparent text-[color:var(--ink-soft)]",
    dark: "bg-ink text-white border border-white/10 shadow-lg",
    danger: "bg-[#e5395c] text-white shadow-[0_12px_26px_-14px_rgba(229,57,92,.8)]",
  };
  const sizes = { sm: "min-h-10 px-4 text-[13px]", md: "min-h-12 px-5 text-[15px]", lg: "min-h-14 px-6 text-[16px]" };
  return <button {...props} className={cn("press inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold tracking-[0.01em] disabled:opacity-45", variants[variant], sizes[size], full && "w-full", className)} onClick={(event) => { haptic("tap"); onClick?.(event); }} />;
}

export function Chip({
  selected = false,
  onClick,
  children,
  size = "md",
  tone = "light",
}: {
  selected?: boolean;
  onClick?(): void;
  children: ReactNode;
  size?: "sm" | "md";
  tone?: "light" | "dark";
}): React.JSX.Element {
  const padding = size === "sm" ? "min-h-9 px-3.5 text-[12px]" : "min-h-11 px-4 text-[13px]";
  return (
    <button
      type="button"
      onClick={() => { haptic("tap"); onClick?.(); }}
      className={cn(
        "press shrink-0 rounded-full border font-semibold whitespace-nowrap transition-all",
        padding,
        selected
          ? "border-transparent brand-gradient text-white shadow-[0_10px_22px_-12px_rgba(214,18,83,.8)]"
          : tone === "dark"
            ? "border-white/15 bg-white/8 text-white/80"
            : "border-white/80 bg-white/60 text-[color:var(--ink-soft)] backdrop-blur-md",
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, onClick, active = false, className }: { label: string; children: ReactNode; onClick?(): void; active?: boolean; className?: string }): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => { haptic("tap"); onClick?.(); }}
      className={cn(
        "press grid h-10 w-10 shrink-0 place-items-center rounded-full border backdrop-blur-md transition-colors",
        active ? "border-transparent brand-gradient text-white" : "border-white/70 bg-white/60 text-[color:var(--ink)]",
        className,
      )}
    >
      {children}
    </button>
  );
}
