"use client";

import { useState } from "react";
import { Heart, Image as ImageIcon, MessageCircle, Palette, Phone, Play, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Chip } from "@/components/ui/Button";
import { BOND_THRESHOLDS } from "@/lib/constants";
import { findCharacter } from "@/lib/engine/engineUtils";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";
import { useToast } from "@/components/ui/Toast";

export function CharacterSheet({ characterId }: { characterId: string }): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const { startChat, requestCall } = useEngine();
  const { toast } = useToast();
  const [playing, setPlaying] = useState(false);
  const character = findCharacter(state, characterId);
  if (!character) return <div className="py-8 text-center text-sm">This companion isn’t here anymore.</div>;
  const sent = state.chats[characterId]?.sent ?? 0;
  const bond = Math.max(1, BOND_THRESHOLDS.reduce((level, threshold, index) => sent >= threshold ? index + 1 : level, 1));
  const tags = character.personality.split(/,\s*/).filter(Boolean).slice(0, 5);
  const gallery = [character.photo, ...character.gallery].filter((src): src is string => Boolean(src)).slice(0, 3);

  const begin = () => { startChat(characterId); nav.closeSheet(); nav.push({ name: "chat", characterId }); };
  const call = () => { startChat(characterId); nav.closeSheet(); nav.push({ name: "chat", characterId }); requestCall(characterId); toast(`Asking ${character.name} to call…`, "✨"); };
  const preview = () => {
    setPlaying(true);
    speak(character.greeting, { gender: character.gender, voice: character.voice }, { onEnd: () => setPlaying(false) });
  };

  return (
    <div className="pb-2">
      <div className="relative -mx-5 -mt-4 h-[230px] overflow-hidden">
        {character.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character.photo} alt={character.name} className="h-full w-full object-cover object-[center_26%]" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[linear-gradient(150deg,#ffd9e5,#ffeedf_60%,#efe2ff)] text-6xl">{character.emoji}</div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,12,.15)_0%,transparent_35%,rgba(255,251,250,.55)_78%,#fffbfa_100%)]" />
        <div className="absolute inset-x-5 bottom-2 flex items-end justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#a33b5e] backdrop-blur"><ShieldCheck size={9} />AI companion</span>
            <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight text-[#2b0d16]">{character.name} <span className="text-[15px] font-medium text-[#7d4a5d]">{character.age}</span></h2>
            <p className="text-[11.5px] font-medium text-[#7d4a5d]">{character.tagline}</p>
          </div>
          <Avatar character={character} size={56} className="mb-1" />
        </div>
      </div>

      <div className="-mt-1 flex gap-2">
        <Button full onClick={begin}><MessageCircle size={16} />Chat</Button>
        <Button variant="soft" onClick={call} className="w-[62px] shrink-0 px-0"><Phone size={17} /></Button>
        <Button variant="soft" onClick={() => nav.openSheet({ name: "wallpaper", characterId })} className="w-[62px] shrink-0 px-0"><Palette size={17} /></Button>
      </div>

      {gallery.length > 1 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Little moments</h3><span className="flex items-center gap-1 text-[9px] text-[#8a596b]"><ImageIcon size={10} />{gallery.length} photos</span></div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {gallery.slice(1).map((src, index) => (
              <span key={`${src.slice(-20)}-${index}`} className="relative h-[104px] w-[82px] shrink-0 overflow-hidden rounded-[16px] border border-white/70">
                <img src={src} alt="A moment" className="h-full w-full object-cover" />
              </span>
            ))}
            <span className="grid h-[104px] w-[82px] shrink-0 place-items-center rounded-[16px] border border-dashed border-[#d68aa4] text-center text-[9px] leading-tight text-[#a33b5e]">photos they<br />send you<br />land here</span>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">A little about them</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5c2a3b]">{character.bio}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">{tags.map((tag) => <Chip key={tag} size="sm">{tag}</Chip>)}</div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-[#fff0f4] p-3">
        <button type="button" aria-label="Preview voice" onClick={preview} className="press grid h-11 w-11 shrink-0 place-items-center rounded-full brand-gradient text-white">
          {playing ? <Sparkles size={17} className="animate-pulse" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-bold text-[#34101d]">Their voice</h3>
          <p className="truncate text-[10.5px] text-[#8a596b]">{character.voice}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[9px] font-bold text-[#a33b5e]">{playing ? "playing…" : "preview"}</span>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[20px] bg-white/60 p-3">
        <div>
          <h3 className="text-[12px] font-bold text-[#34101d]">Your bond</h3>
          <p className="text-[10px] text-[#8a596b]">{sent} messages · growing at your pace</p>
        </div>
        <span aria-label={`Bond level ${bond}`} className="flex items-center gap-1 text-[#f5286e]">{Array.from({ length: bond }, (_, index) => <Heart key={index} size={13} fill="currentColor" strokeWidth={0} />)}</span>
      </div>
    </div>
  );
}
