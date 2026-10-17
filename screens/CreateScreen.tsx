"use client";

import { useState } from "react";
import { ArrowLeft, Shuffle, Sparkles, Volume2 } from "lucide-react";
import { Bake } from "@/components/effects/Bake";
import { fx } from "@/components/effects/Particles";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Chip } from "@/components/ui/Button";
import { CookieMark } from "@/components/ui/Cookie";
import { ACCENTS, AVATAR_EMOJIS, PLANS, VOICE_PRESETS } from "@/lib/constants";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { setState, useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";
import type { Character } from "@/lib/types";
import { uid } from "@/lib/utils";

const hash = (value: string) => { let result = 0; for (const character of value) result = (result * 31 + (character.codePointAt(0) ?? 0)) % 100_003; return result; };
export function CreateScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav(); const { startChat } = useEngine();
  const [step, setStep] = useState(0); const [name, setName] = useState(""); const [voice, setVoice] = useState("");
  const [shuffle, setShuffle] = useState(0); const [isPublic, setIsPublic] = useState(false);
  const [baking, setBaking] = useState(false); const [created, setCreated] = useState<Character | null>(null);
  const trimmed = name.trim();
  const seed = hash(`${trimmed || "cookie companion"}·${shuffle}`);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "#F19AB8";
  const emoji = AVATAR_EMOJIS[Math.floor(seed / 7) % AVATAR_EMOJIS.length] ?? "🌷";
  const characterDraft: Character = { id: "preview", name: trimmed || "Your companion", age: 22, gender: "custom", tagline: "a companion made by you", bio: "Made with a little love in the Cookie studio.", personality: "warm, playful, curious, and kind", voice: voice.trim(), greeting: `hey, I'm ${trimmed || "here"} ✨`, accent, emoji, category: "Friend", chats: 0, creator: state.session?.name || "You", isPublic, isMine: true };
  const error = step === 0 ? (!trimmed ? "Give your companion a name to continue." : "") : step === 1 ? (!voice.trim() ? "Describe their voice in a few words." : "") : "";
  const next = () => {
    if (error) return;
    if (step === 0) { setStep(1); return; }
    if (state.customCharacters.length >= PLANS[state.plan].maxCharacters) { nav.openSheet({ name: "paywall" }); return; }
    setBaking(true);
  };
  const finishBake = () => {
    const character: Character = { ...characterDraft, id: uid() };
    // TODO(supabase)
    setState((current) => ({ ...current, customCharacters: [...current.customCharacters, character] }));
    setCreated(character); setBaking(false);
    const shell = document.querySelector(".app-shell")?.getBoundingClientRect();
    fx.confetti(shell ? shell.width / 2 : 215, shell ? shell.height / 2 : 360);
  };
  const startCreatedChat = () => {
    if (!created) return;
    startChat(created.id); nav.replace({ name: "chat", characterId: created.id });
  };
  return <main className="absolute inset-0 flex flex-col overflow-hidden px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
    <div className="mesh-bg"/>
    <header className="flex shrink-0 items-center gap-3"><button type="button" aria-label="Go back" onClick={() => created ? nav.pop() : step > 0 ? setStep(step - 1) : nav.pop()} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70"><ArrowLeft size={19}/></button><div className="flex-1"><h1 className="font-display text-xl font-bold">{created ? "Fresh from the oven" : "New companion"}</h1><p className="text-[11px] font-semibold text-choc-soft">{created ? "They're all yours" : step === 0 ? "Name them first" : "Almost there"}</p></div><CookieMark size={36}/></header>
    {!created && <div className="mt-3 flex gap-1.5">{[0, 1].map((index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "[background:linear-gradient(90deg,#ffb7d9,#c9b6ff)]" : "bg-white/70"}`}/>)}</div>}
    <section className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto pb-4">
      {!created && step === 0 && <div>
        <h2 className="font-display text-2xl font-bold">Who are we making?</h2><p className="mt-2 text-sm text-choc-soft">Just a name — they arrive with a look of their own.</p>
        <input autoFocus value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Up to 24 characters" className="clay mt-5 min-h-14 w-full px-4 outline-none focus:ring-2 focus:ring-lavender"/>
        <div className="clay mt-5 flex items-center gap-4 p-4"><Avatar character={characterDraft} size={78}/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-choc-soft">their look</p><h3 className="truncate font-display text-xl font-bold">{characterDraft.name}</h3><p className="text-xs text-choc-soft">A color and sticker picked for you</p></div><Button variant="clay" size="sm" onClick={() => setShuffle(shuffle + 1)}><Shuffle size={15}/>Shuffle</Button></div>
      </div>}
      {!created && step === 1 && <div>
        <h2 className="font-display text-2xl font-bold">What should they sound like?</h2><p className="mt-2 text-sm text-choc-soft">Describe their voice in a few words — or pick a vibe.</p>
        <textarea value={voice} maxLength={120} onChange={(event) => setVoice(event.target.value)} placeholder="Soft, warm, slightly raspy…" className="clay mt-4 min-h-24 w-full resize-none p-4 outline-none focus:ring-2 focus:ring-lavender"/>
        <div className="mt-3 flex flex-wrap gap-2">{VOICE_PRESETS.map((preset) => <Chip key={preset.name} size="sm" onClick={() => setVoice(preset.description)}>{preset.name}</Chip>)}</div>
        <Button variant="clay" className="mt-4" onClick={() => speak("Hey, I'm glad you're here. Tell me what's on your mind.", { gender: "custom", voice: voice.trim() }, {})}><Volume2 size={17}/>Preview voice</Button>
        <div className="clay mt-5 flex items-center justify-between gap-3 p-4"><div><h3 className="font-display font-bold">Share to Discover</h3><p className="mt-1 max-w-[210px] text-xs text-choc-soft">Public companions can be found by other Cookie users.</p></div><button type="button" aria-label="Share companion publicly" aria-pressed={isPublic} onClick={() => setIsPublic(!isPublic)} className="flex min-h-11 min-w-14 shrink-0 items-center justify-center"><span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${isPublic ? "shadow-[inset_0_1px_0_rgba(255,255,255,.9)] [background:linear-gradient(135deg,#ffb7d9,#c9b6ff)]" : "bg-choc/20"}`}><span className={`block h-6 w-6 rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : ""}`}/></span></button></div>
      </div>}
      {created ? <div className="clay flex flex-col items-center p-6 text-center"><Avatar character={created} size={110}/><h2 className="mt-4 font-display text-2xl font-bold">{created.name} is ready</h2><p className="mt-2 text-sm text-choc-soft">A little personality, a little magic, all yours.</p><Button full className="mt-5" onClick={startCreatedChat}>Start chatting</Button><button type="button" onClick={() => { setState((current) => ({ ...current, customCharacters: current.customCharacters.map((item) => item.id === created.id ? { ...item, isPublic: true } : item) })); setCreated({ ...created, isPublic: true }); }} className="mt-2 min-h-11 text-sm font-bold text-choc-soft">Share to Discover</button></div> : baking ? <Bake name={characterDraft.name} onDone={finishBake}/> : null}
    </section>
    {!created && !baking && <div className="shrink-0"><Button full size="lg" disabled={Boolean(error)} onClick={next}>{step === 0 ? "Next" : <><Sparkles size={17}/>Save companion</>}</Button>{error && <p className="mt-2 text-center text-xs font-semibold text-danger">{error}</p>}</div>}
  </main>;
}
