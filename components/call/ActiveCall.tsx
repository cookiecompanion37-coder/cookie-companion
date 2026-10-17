"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Captions, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useCallSession } from "@/lib/engine/useCallSession";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { formatTime } from "@/lib/utils";
import { useAppState, setState } from "@/lib/store";
import { callSecondsLeft } from "@/lib/credits";

const phaseLabel = { connecting: "connecting…", listening: "listening", thinking: "thinking…", speaking: "speaking" };
export function ActiveCall(): React.JSX.Element | null {
  const { call, endCall, setMuted, setSpeaker } = useEngine();
  const state = useAppState();
  const session = useCallSession();
  const [caption, setCaption] = useState("");
  const character = call ? findCharacter(state, call.characterId) : undefined;
  const startedAt = call ? Date.now() - call.seconds * 1000 : 0;
  const lastAiMessage = call
    ? [...(state.chats[call.characterId]?.messages ?? [])].reverse().find((message) => message.role === "assistant" && message.text && message.ts >= startedAt - 2500)
    : undefined;
  const spoken = call?.ai || lastAiMessage?.text || "";

  useEffect(() => {
    if (!spoken) { setCaption(""); return; }
    const words = spoken.split(/\s+/);
    let index = 0;
    const timer = window.setInterval(() => { index += 1; setCaption(words.slice(0, index).join(" ")); if (index >= words.length) window.clearInterval(timer); }, 170);
    return () => window.clearInterval(timer);
  }, [spoken]);

  if (!call || !character) return null;
  const secondsLeft = callSecondsLeft(state);
  const scale = 1 + Math.min(0.12, session.level * 0.14);
  const toggleCaptions = () => setState((current) => ({ ...current, settings: { ...current.settings, captions: !current.settings.captions } }));

  return (
    <motion.div initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[75] flex flex-col overflow-hidden bg-[#240812] text-white">
      {character.photo ? (
        <img src={character.photo} alt={character.name} className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px]" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${character.accent}, #3a1229)` }} />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,12,.55)_0%,rgba(20,4,12,.25)_28%,rgba(20,4,12,.82)_82%,#1c0710_100%)]" />

      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]">
        <span className="rounded-full bg-white/15 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur-md">AI voice call</span>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold backdrop-blur-md ${secondsLeft < 60 ? "bg-[#ffd9a6] text-[#5c2a3b]" : "bg-white/15"}`}><Phone size={11} className="mr-1 inline" />{formatTime(secondsLeft)} left</span>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-2 text-center">
        <div className="relative grid h-[min(52vw,206px)] w-[min(52vw,206px)] place-items-center">
          {[0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              className="absolute rounded-full border border-white/50"
              style={{ inset: `${ring * 20}px`, scale }}
              animate={{ opacity: call.phase === "speaking" ? [0.5, 0.95, 0.5] : [0.2, 0.45, 0.2] }}
              transition={{ duration: 2.1, repeat: Infinity, delay: ring * 0.22 }}
            />
          ))}
          <Avatar character={character} size={132} shape="circle" ring />
        </div>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight drop-shadow-sm">{character.name}</h1>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-white/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7fe3b4]" />
          {phaseLabel[call.phase]} · {formatTime(call.seconds)}
        </div>

        {state.settings.captions && (
          <div className="mt-5 min-h-[62px] max-w-[330px] rounded-[22px] border border-white/15 bg-black/25 px-4 py-3 text-[12.5px] leading-relaxed backdrop-blur-md">
            {(session.heard || call.user) && <p className="mb-1 text-[10px] text-white/50">you said · {session.heard || call.user}</p>}
            <p className="min-h-[18px]">{caption || (call.phase === "speaking" ? "…" : call.phase === "connecting" ? "connecting the call…" : "I'm listening…")}</p>
          </div>
        )}

        {!session.canUseVoice && (
          <form className="mt-3 flex w-full max-w-[330px] gap-2" onSubmit={(event) => { event.preventDefault(); session.submit(session.draft); }}>
            <input aria-label="Type to talk" value={session.draft} onChange={(event) => session.setDraft(event.target.value)} placeholder="Type to talk…" className="min-h-11 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-[12px] text-white outline-none placeholder:text-white/50" />
            <button type="submit" aria-label="Send" className="min-h-11 rounded-full bg-white px-4 font-display text-[12px] font-bold text-[#c60f4d]">Send</button>
          </form>
        )}
      </div>

      <div className="relative z-10 mx-auto mb-[max(18px,env(safe-area-inset-bottom))] flex w-full max-w-[340px] items-center justify-between rounded-[28px] border border-white/15 bg-black/25 px-3.5 py-3 backdrop-blur-xl">
        <Control label={call.muted ? "Muted" : "Mute"} active={call.muted} onClick={() => setMuted(!call.muted)} icon={call.muted ? <MicOff size={19} /> : <Mic size={19} />} />
        <Control label="Speaker" active={call.speaker} onClick={() => setSpeaker(!call.speaker)} icon={call.speaker ? <Volume2 size={19} /> : <VolumeX size={19} />} />
        <Control label="Captions" active={state.settings.captions} onClick={toggleCaptions} icon={<Captions size={19} />} />
        <button type="button" onClick={endCall} aria-label="End call" className="press grid h-14 w-14 place-items-center rounded-full bg-[#e5395c] text-white shadow-[0_12px_26px_-10px_rgba(229,57,92,.9)]"><PhoneOff size={23} /></button>
      </div>
    </motion.div>
  );
}

function Control({ label, active, onClick, icon }: { label: string; active: boolean; onClick(): void; icon: ReactNode }): React.JSX.Element {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`press flex min-h-[54px] min-w-[58px] flex-col items-center justify-center gap-1 rounded-[18px] text-[8.5px] font-semibold ${active ? "bg-white/20 text-white" : "text-white/65"}`}>
      {icon}<span>{label}</span>
    </button>
  );
}
