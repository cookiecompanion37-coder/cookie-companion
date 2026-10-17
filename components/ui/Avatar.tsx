import { cn } from "@/lib/utils";

type AvatarCharacter = { accent: string; emoji: string; name: string };
export function Avatar({ character, size = 54, online = false, ring = true, busy = false }: { character: AvatarCharacter; size?: number; online?: boolean; ring?: boolean; busy?: boolean }): React.JSX.Element {
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-[30%]", ring && "p-[3px]")} style={{ width: size, height: size, background: ring ? `linear-gradient(145deg,${character.accent},#fff4e2)` : "transparent" }}>
    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[27%] border border-white/80 shadow-[inset_0_2px_6px_rgba(122,82,56,.12)]" style={{ background: `linear-gradient(150deg,${character.accent}55,#fffaf0)` }}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-white/35" />
      <span aria-label={character.name} role="img" className="relative" style={{ fontSize: Math.round(size * .5) }}>{character.emoji}</span>
    </span>
    {online && <span aria-label="online" className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-cream bg-ok" />}
    {busy && <span aria-label="busy" className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-cream bg-biscuit" />}
  </span>;
}
