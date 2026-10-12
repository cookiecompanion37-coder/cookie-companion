"use client";

import { useState } from "react";
import { ArrowLeft, Volume2 } from "lucide-react";
import { Bake } from "@/components/effects/Bake";
import { fx } from "@/components/effects/Particles";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Chip } from "@/components/ui/Button";
import { ACCENTS, AVATAR_EMOJIS, PLANS, VOICE_PRESETS } from "@/lib/constants";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { setState, useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";
import type { Character, Gender } from "@/lib/types";
import { uid } from "@/lib/utils";

const SUGGESTIONS = ["playful", "teasing", "caring", "sarcastic", "shy", "nerdy", "protective"];
const GENDERS: { id: Gender; label: string }[] = [{ id: "female", label: "Female" }, { id: "male", label: "Male" }, { id: "nonbinary", label: "Non-binary" }, { id: "custom", label: "Custom" }];
export function CreateScreen(): React.JSX.Element {
  const state = useAppState(); const nav = useNav(); const { startChat } = useEngine();
  const [step, setStep] = useState(0); const [name, setName] = useState(""); const [age, setAge] = useState(22); const [gender, setGender] = useState<Gender>("female");
  const [personality, setPersonality] = useState(""); const [greeting, setGreeting] = useState(""); const [voice, setVoice] = useState(""); const [accent, setAccent] = useState(ACCENTS[0] ?? "#F19AB8"); const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0] ?? "🌷");
  const [isPublic, setIsPublic] = useState(false); const [baking, setBaking] = useState(false); const [created, setCreated] = useState<Character | null>(null);
  const characterDraft: Character = { id: "preview", name: name.trim() || "Your companion", age, gender, tagline: personality.slice(0, 72) || "A new friend, made by you", bio: greeting || "A companion made just for you.", personality: personality.trim(), voice: voice.trim(), greeting: greeting.trim() || `hey, I'm ${name || "here"} ✨`, accent, emoji, category: "Friend", chats: 0, creator: state.session?.name || "You", isPublic, isMine: true };
  const error = step === 0 ? (!name.trim() ? "Give your companion a name to continue." : age < 18 ? "Companions must be 18 or older." : "") : step === 1 ? (!personality.trim() ? "Add a little personality to continue." : "") : step === 2 ? (!voice.trim() ? "Describe their voice in a few words." : "") : "";
  const appendSuggestion = (suggestion: string) => setPersonality((current) => `${current}${current.trim() ? ", " : ""}${suggestion}`.slice(0, 600));
  const next = () => {
    if (error) return;
    if (step < 3) { setStep(step + 1); return; }
    if (state.customCharacters.length >= PLANS[state.plan].maxCharacters) { nav.openSheet({ name: "paywall" }); return; }
    setStep(4); setBaking(true);
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
    <header className="flex shrink-0 items-center gap-3"><button type="button" aria-label="Go back" onClick={() => created ? nav.pop() : step > 0 ? setStep(step - 1) : nav.pop()} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/65"><ArrowLeft size={19}/></button><div className="flex-1"><p className="text-xs font-bold uppercase tracking-wide text-choc-soft">your companion studio</p><h1 className="font-display text-xl font-bold">{created ? "Fresh from the oven" : `Create · step ${Math.min(step + 1, 5)} of 5`}</h1></div><span className="text-xl">🍪</span></header>
    {!created && <div className="mt-3 flex gap-1.5">{[0, 1, 2, 3, 4].map((index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-biscuit" : "bg-white/70"}`}/>)}</div>}
    <section className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto pb-4">
      {step === 0 && !created && <div><h2 className="font-display text-2xl font-bold">Who are we making?</h2><label className="mt-5 block text-sm font-bold">Name</label><input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Up to 24 characters" className="clay mt-2 min-h-12 w-full rounded-[18px] px-4 outline-none"/><div className="mt-5 flex items-center justify-between"><div><h3 className="font-display font-bold">Age</h3><p className="text-xs text-choc-soft">18+ only</p></div><div className="flex items-center gap-4"><button type="button" aria-label="Decrease age" disabled={age <= 18} onClick={() => setAge(Math.max(18, age - 1))} className="h-11 w-11 rounded-full bg-white/70 text-xl disabled:opacity-40">−</button><span className="w-8 text-center font-display text-xl font-bold">{age}</span><button type="button" aria-label="Increase age" onClick={() => setAge(Math.min(99, age + 1))} className="h-11 w-11 rounded-full bg-white/70 text-xl">+</button></div></div><h3 className="mt-5 font-display font-bold">Gender</h3><div className="mt-2 flex flex-wrap gap-2">{GENDERS.map((item) => <Chip key={item.id} selected={gender === item.id} size="sm" onClick={() => setGender(item.id)}>{item.label}</Chip>)}</div></div>}
      {step === 1 && !created && <div><h2 className="font-display text-2xl font-bold">Give them a personality</h2><p className="mt-2 text-sm text-choc-soft">A few details help your companion feel like themselves.</p><div className="mt-4 flex flex-wrap gap-2">{SUGGESTIONS.map((item) => <Chip key={item} size="sm" onClick={() => appendSuggestion(item)}>{item}</Chip>)}</div><textarea value={personality} maxLength={600} onChange={(event) => setPersonality(event.target.value)} placeholder="Warm, curious, a little sarcastic…" className="clay mt-4 min-h-36 w-full resize-none rounded-[20px] p-4 outline-none"/><p className="mt-1 text-right text-xs text-choc-soft">{personality.length}/600</p><label className="mt-4 block text-sm font-bold">Optional greeting</label><textarea value={greeting} maxLength={220} onChange={(event) => setGreeting(event.target.value)} placeholder="What do they say when you first meet?" className="clay mt-2 min-h-20 w-full resize-none rounded-[18px] p-4 outline-none"/></div>}
      {step === 2 && !created && <div><h2 className="font-display text-2xl font-bold">What should they sound like?</h2><p className="mt-2 text-sm text-choc-soft">Describe the voice in words.</p><textarea value={voice} maxLength={120} onChange={(event) => setVoice(event.target.value)} placeholder="Soft, warm, slightly raspy…" className="clay mt-5 min-h-24 w-full resize-none rounded-[20px] p-4 outline-none"/><div className="mt-3 flex flex-wrap gap-2">{VOICE_PRESETS.map((preset) => <Chip key={preset.name} size="sm" onClick={() => setVoice(preset.description)}>{preset.name}</Chip>)}</div><Button variant="clay" className="mt-4" onClick={() => speak("Hey, I'm glad you're here. Tell me what's on your mind.", { gender, voice }, {})}><Volume2 size={17}/>Preview voice</Button></div>}
      {step === 3 && !created && <div><h2 className="font-display text-2xl font-bold">Add their signature color</h2><p className="mt-2 text-sm text-choc-soft">Pick an accent and a little avatar sticker.</p><div className="mt-5 flex flex-wrap gap-3">{ACCENTS.map((color) => <button key={color} type="button" aria-label={`Select ${color}`} onClick={() => setAccent(color)} className={`h-12 w-12 rounded-[17px] border-4 border-white shadow ${accent === color ? "ring-2 ring-choc" : ""}`} style={{ backgroundColor: color }}/>)}</div><h3 className="mt-6 font-display font-bold">Avatar</h3><div className="mt-3 grid grid-cols-6 gap-2">{AVATAR_EMOJIS.map((item) => <button key={item} type="button" onClick={() => setEmoji(item)} className={`flex h-12 items-center justify-center rounded-2xl bg-white/70 text-2xl ${emoji === item ? "ring-2 ring-biscuit" : ""}`}>{item}</button>)}</div><div className="mt-6 flex items-center justify-between rounded-[20px] bg-white/55 p-4"><div><h3 className="font-display font-bold">Share to Discover</h3><p className="mt-1 max-w-[220px] text-xs text-choc-soft">Public companions can be found by other Cookie users.</p></div><button type="button" aria-label="Share companion publicly" aria-pressed={isPublic} onClick={() => setIsPublic(!isPublic)} className="flex min-h-11 min-w-14 items-center justify-center"><span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${isPublic ? "bg-ok" : "bg-choc/20"}`}><span className={`block h-6 w-6 rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : ""}`}/></span></button></div></div>}
      {step === 4 && (created ? <div className="clay flex flex-col items-center rounded-[30px] p-6 text-center"><Avatar character={created} size={110}/><h2 className="mt-4 font-display text-2xl font-bold">{created.name} is ready</h2><p className="mt-2 text-sm text-choc-soft">A little personality, a little magic, all yours.</p><Button full className="mt-5" onClick={startCreatedChat}>Start chatting</Button><button type="button" onClick={() => { setState((current) => ({ ...current, customCharacters: current.customCharacters.map((item) => item.id === created.id ? { ...item, isPublic: true } : item) })); setCreated({ ...created, isPublic: true }); }} className="mt-2 min-h-11 text-sm font-bold text-choc-soft">Share to Discover</button></div> : baking ? <Bake name={characterDraft.name} onDone={finishBake}/> : null)}
    </section>
    {!created && !baking && step < 4 && <div className="shrink-0"><Button full size="lg" disabled={Boolean(error)} onClick={next}>{step === 3 ? "Bake your companion" : "Next"}</Button>{error && <p className="mt-2 text-center text-xs font-semibold text-danger">{error}</p>}</div>}
  </main>;
}
