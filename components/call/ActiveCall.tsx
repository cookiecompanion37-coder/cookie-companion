"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Captions, Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useCallSession } from "@/lib/engine/useCallSession";
import { useEngine } from "@/lib/engine/EngineProvider";
import { findCharacter } from "@/lib/engine/engineUtils";
import { formatTime } from "@/lib/utils";
import { useAppState, setState } from "@/lib/store";
import { callSecondsLeft } from "@/lib/credits";

const phaseLabel = { connecting: "Connecting…", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" };
export function ActiveCall(): React.JSX.Element | null {
  const { call, endCall, setMuted, setSpeaker } = useEngine(); const state = useAppState();
  const session = useCallSession(); const [caption, setCaption] = useState("");
  const character = call ? findCharacter(state, call.characterId) : undefined;
  useEffect(() => {
    if (!call?.ai) { setCaption(""); return; }
    const words = call.ai.split(/\s+/); let index = 0;
    const timer = window.setInterval(() => { index += 1; setCaption(words.slice(0, index).join(" ")); if (index >= words.length) window.clearInterval(timer); }, 180);
    return () => window.clearInterval(timer);
  }, [call?.ai]);
  if (!call || !character) return null;
  const secondsLeft = callSecondsLeft(state);
  const scale = 1 + Math.min(.13, session.level * .14);
  const toggleCaptions = () => setState((current) => ({ ...current, settings: { ...current.settings, captions: !current.settings.captions } }));
  return <motion.div className="absolute inset-0 z-[55] flex flex-col items-center overflow-hidden px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(42px,env(safe-area-inset-top))] text-center text-choc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: `radial-gradient(circle at 50% 30%,${character.accent}88,${character.accent}22 50%,#fffbf0 100%)` }}>
    <div className="absolute inset-0 bg-cream/40 backdrop-blur-2xl"/><div className="relative z-10 flex w-full items-center justify-between"><span className="rounded-full bg-white/65 px-3 py-2 text-xs font-bold">Cookie · voice call</span><span className={`rounded-full px-3 py-2 text-xs font-bold ${secondsLeft < 60 ? "bg-peach text-choc" : "bg-white/65"}`}>📞 {formatTime(secondsLeft)} left</span></div>
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center"><div className="relative grid h-[260px] w-[260px] place-items-center">
      {[0, 1, 2].map((ring) => <motion.span key={ring} className="absolute rounded-full border-2 border-white/75" style={{ inset: `${ring * 18}px`, scale }} animate={{ opacity: call.phase === "speaking" ? [.45, .9, .45] : [.22, .48, .22] }} transition={{ duration: 2, repeat: Infinity, delay: ring * .2 }} />)}
      <Avatar character={character} size={172} ring/>
    </div><h1 className="mt-2 font-display text-3xl font-bold">{character.name}</h1><p className="mt-2 text-sm font-semibold text-choc-soft">{phaseLabel[call.phase]}</p><p className="mt-2 font-display text-2xl font-bold tabular-nums">{formatTime(call.seconds)}</p>
      {state.settings.captions && <div className="mt-4 min-h-[68px] max-w-sm rounded-[22px] bg-white/55 px-4 py-3 text-sm leading-relaxed">{call.user && <p className="mb-1 text-xs text-choc-soft/70">You: {call.user}</p>}<p>{caption || (call.phase === "speaking" ? "…" : "")}</p></div>}
      {!session.canUseVoice && <form className="mt-3 flex w-full max-w-sm gap-2" onSubmit={(event) => { event.preventDefault(); session.submit(session.draft); }}><input aria-label="Type to talk" value={session.draft} onChange={(event) => session.setDraft(event.target.value)} placeholder="Type to talk…" className="min-h-11 flex-1 rounded-full border border-white bg-white/75 px-4 outline-none"/><button aria-label="Send" className="min-h-11 rounded-full px-4 font-bold text-choc [background:linear-gradient(135deg,#ffd9a6,#ffb3d1_45%,#c9b0ff)]">Send</button></form>}
    </div>
    <div className="relative z-10 flex w-full max-w-sm items-center justify-between rounded-[28px] bg-white/60 px-3 py-4 shadow-lg">
      <Control label={call.muted ? "Unmute" : "Mute"} active={call.muted} onClick={() => setMuted(!call.muted)} icon={call.muted ? <MicOff size={20}/> : <Mic size={20}/>}/>
      <Control label={call.speaker ? "Speaker" : "Earpiece"} active={call.speaker} onClick={() => setSpeaker(!call.speaker)} icon={call.speaker ? <Volume2 size={20}/> : <VolumeX size={20}/>}/>
      <Control label={state.settings.captions ? "Captions on" : "Captions off"} active={state.settings.captions} onClick={toggleCaptions} icon={<Captions size={20}/>}/>
      <button type="button" onClick={endCall} aria-label="End call" className="flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white shadow-lg"><PhoneOff size={23}/></button>
    </div>
  </motion.div>;
}
function Control({ label, active, onClick, icon }: { label: string; active: boolean; onClick(): void; icon: ReactNode }): React.JSX.Element {
  return <button type="button" aria-label={label} onClick={onClick} className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs ${active ? "bg-choc/10 text-choc" : "text-choc-soft"}`}>{icon}<span>{label}</span></button>;
}
