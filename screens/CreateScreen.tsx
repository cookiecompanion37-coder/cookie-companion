"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Sparkles, Volume2, Wand2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Chip } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { ACCENTS, AVATAR_EMOJIS, CATEGORIES, LOOK_CHIPS, OUTFIT_CHIPS, PLANS, VOICE_PRESETS } from "@/lib/constants";
import { useEngine } from "@/lib/engine/EngineProvider";
import { useNav } from "@/lib/nav";
import { setState, useAppState } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { awaitPhoto, persistImage, submitPhoto } from "@/lib/engine/api";
import { compressFromUrl } from "@/lib/media";
import { speak } from "@/lib/voice";
import { uid } from "@/lib/utils";
import type { Character, Category, Gender } from "@/lib/types";

const PERSONALITY = ["warm", "playful", "thoughtful", "witty", "gentle", "curious", "flirty", "calm", "nerdy", "adventurous"];
const GENDERS: { id: Gender; label: string }[] = [{ id: "female", label: "Woman" }, { id: "male", label: "Man" }, { id: "nonbinary", label: "Non-binary" }];
const hash = (value: string) => { let result = 0; for (const character of value) result = (result * 31 + (character.codePointAt(0) ?? 0)) % 100_003; return result; };

export function CreateScreen(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const { startChat } = useEngine();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>("female");
  const [looks, setLooks] = useState<string[]>([]);
  const [outfit, setOutfit] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState<string[]>(["warm", "playful"]);
  const [tagline, setTagline] = useState("");
  const [voice, setVoice] = useState(VOICE_PRESETS[0]?.description ?? "soft, warm, and gentle");
  const [voiceName, setVoiceName] = useState(VOICE_PRESETS[0]?.name ?? "Soft");
  const [category, setCategory] = useState<Category>("Friend");
  const [isPublic, setIsPublic] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const seed = hash(`${name || "cookie"}·${looks.join(",")}·${outfit}`);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "#F19AB8";
  const emoji = AVATAR_EMOJIS[seed % AVATAR_EMOJIS.length] ?? "🌷";
  const lookText = [appearance.trim(), looks.join(", "), outfit.trim()].filter(Boolean).join(", ");
  const effectiveLook = lookText || `a ${age} year old ${gender === "male" ? "man" : gender === "female" ? "woman" : "person"} with a warm smile and a cozy style`;
  const preview: Character = { id: "preview", name: name.trim() || "Your companion", age, gender, tagline: tagline.trim() || "a little sun in human form", bio: `Made with love in the Cookie studio. ${personality.join(", ")}.`, personality: personality.join(", "), voice: `${voiceName.toLowerCase()}, ${voice}`, greeting: `hey, i'm ${name.trim() || "here"} — what took you so long? ✨`, accent, emoji, category, chats: 0, creator: state.session?.name || "You", isPublic, isMine: true, appearance: effectiveLook, photo: photos[mainIndex], gallery: photos.filter((_, index) => index !== mainIndex), wallpaper: "sakura" };
  const toggleLook = (chip: string) => setLooks((items) => items.includes(chip) ? items.filter((item) => item !== chip) : [...items, chip].slice(0, 4));
  const canNext = step === 0 ? name.trim().length >= 2 : step === 1 ? true : personality.length > 0;
  const limit = PLANS[state.plan].maxCharacters;

  const generate = async () => {
    if (!name.trim()) { setError("Give them a name first."); return; }
    setBusy(true); setError(""); setPhotos([]); setMainIndex(0);
    const scenes = [
      "looking into the camera with a soft smile in a warm sunlit room, wearing a cozy outfit",
      "taking a candid mirror selfie in a cozy bedroom with soft morning light, phone in hand",
      "sitting by a café window in the afternoon with a warm drink, candid smile, golden light",
    ];
    const results: string[] = [];
    for (let index = 0; index < scenes.length; index += 1) {
      setProgress(`casting portrait ${index + 1} of 3…`);
      const references = results.length > 0 && /^https?:\/\//i.test(results[0]!) ? [results[0]!] : [];
      const task = await submitPhoto({ scene: scenes[index]!, appearance: effectiveLook, ar: index === 0 ? "4:5" : "3:4", references });
      if (!task) { setProgress("photo studio is offline"); break; }
      const proxy = await awaitPhoto(task.taskId, (seconds) => setProgress(`developing ${index + 1} of 3 · ${seconds}s`));
      if (!proxy) continue;
      const compressed = await compressFromUrl(proxy, 760, 0.84);
      const stored = compressed ? await persistImage(compressed, `characters/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "companion"}`) : proxy;
      if (stored) results.push(stored);
      setPhotos([...results]);
    }
    setBusy(false); setProgress("");
    if (results.length === 0) setError("The photo studio is taking a nap. You can still create them with a sticker avatar — or add VModel keys in .env and try again.");
  };

  const previewVoice = () => {
    if (typeof window === "undefined") return;
    speak(`hey, i'm ${name.trim() || "so glad you're here"}. i've been thinking about you.`, { gender, voice: `${voiceName.toLowerCase()}, ${voice}` }, {});
    toast("Playing a little voice preview…", "🎙");
  };

  const save = () => {
    if (state.customCharacters.length >= limit) { nav.openSheet({ name: "paywall" }); return; }
    if (!name.trim()) { setStep(0); setError("A name first."); return; }
    const character: Character = { ...preview, id: uid(), photo: photos[mainIndex], gallery: photos.filter((_, index) => index !== mainIndex), greeting: `hey, i'm ${name.trim()} ✨ what's on your mind?` };
    setState((current) => ({ ...current, customCharacters: [...current.customCharacters, character], characterWallpapers: { ...current.characterWallpapers, [character.id]: "sakura" } }));
    if (isPublic) void fetch("/api/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(character) }).catch(() => undefined);
    startChat(character.id);
    toast(`${character.name} is ready`, "🍪");
    nav.replace({ name: "chat", characterId: character.id });
  };

  const steps = ["Them", "Their look", "Their soul"];
  return (
    <WScreen id="sakura">
      <main className="relative z-10 flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 px-5 pt-[max(18px,env(safe-area-inset-top))]">
          <button type="button" onClick={() => step > 0 ? setStep(step - 1) : nav.pop()} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#8a4258]"><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[21px] font-semibold leading-tight text-[#34101d]">New companion</h1>
            <p className="text-[10px] font-semibold text-[#a33b5e]">{steps[step]} · step {step + 1} of 3</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full brand-gradient text-white"><Sparkles size={15} /></span>
        </header>
        <div className="mx-5 mt-3 flex shrink-0 gap-1.5">
          {steps.map((label, index) => <span key={label} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? "brand-gradient" : "bg-white/60"}`} />)}
        </div>

        <section className="no-scrollbar mt-4 flex-1 overflow-y-auto px-5 pb-4">
          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="relative mb-5 flex flex-col items-center">
                <Avatar character={{ name: name || "?", emoji, accent, photo: photos[mainIndex] }} size={124} />
                {(photos.length > 0 || busy) && <span className="absolute bottom-1 right-[calc(50%-64px)] rounded-full bg-white/85 px-2 py-0.5 text-[8.5px] font-bold text-[#a33b5e] shadow-sm">{photos.length ? "generated" : "styling…"}</span>}
                <h2 className="mt-3 font-display text-[24px] font-semibold text-[#34101d]">{name.trim() || "Someone new"}</h2>
                <p className="text-[11px] text-[#8a596b]">a companion made by you</p>
              </div>

              <label className="glass block rounded-[18px] px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Name</span>
                <input autoFocus maxLength={24} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="e.g. Nova, Theo, June…" className="mt-1 w-full bg-transparent text-[17px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/60" />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="glass block rounded-[18px] px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Age</span>
                  <input type="number" min={18} max={99} value={age} onChange={(event) => setAge(Math.min(99, Math.max(18, Number(event.target.value) || 18)))} className="mt-1 w-full bg-transparent text-[17px] text-[#34101d] outline-none" />
                </label>
                <div className="glass rounded-[18px] px-2.5 py-2">
                  <span className="px-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Gender</span>
                  <div className="mt-1.5 flex gap-1">{GENDERS.map((option) => <button key={option.id} type="button" onClick={() => setGender(option.id)} className={`press flex-1 rounded-full py-1.5 text-[9.5px] font-bold ${gender === option.id ? "brand-gradient text-white" : "bg-white/60 text-[#8a596b]"}`}>{option.label}</button>)}</div>
                </div>
              </div>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Category</h3>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map((item) => <Chip key={item} size="sm" selected={category === item} onClick={() => setCategory(item)}>{item}</Chip>)}</div>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Tagline</h3>
              <input value={tagline} maxLength={60} onChange={(event) => setTagline(event.target.value)} placeholder="one line about them" className="glass mt-2 min-h-11 w-full rounded-[18px] px-4 text-[13px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/60" />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="font-display text-[24px] font-semibold leading-tight text-[#34101d]">What do they<br />look like?</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#8a596b]">We&apos;ll turn this into a small photo album they can share with you.</p>

              <textarea value={appearance} maxLength={280} onChange={(event) => setAppearance(event.target.value)} placeholder="a few words: soft freckles, wavy hair, warm eyes, always in a cream sweater…" className="glass mt-3 min-h-[84px] w-full resize-none rounded-[18px] p-3.5 text-[13px] leading-relaxed text-[#34101d] outline-none placeholder:text-[#a97c8b]/60" />

              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Little details</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{LOOK_CHIPS.map((chip) => <Chip key={chip} size="sm" selected={looks.includes(chip)} onClick={() => toggleLook(chip)}>{chip}</Chip>)}</div>

              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Usual outfit</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{OUTFIT_CHIPS.map((chip) => <Chip key={chip} size="sm" selected={outfit === chip} onClick={() => setOutfit(outfit === chip ? "" : chip)}>{chip}</Chip>)}</div>

              <div className="mt-5 flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Photo studio</h3>
                <span className="text-[9px] text-[#8a596b]">{photos.length}/3 kept</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => {
                  const url = photos[slot];
                  const active = mainIndex === slot;
                  return (
                    <button key={slot} type="button" onClick={() => { if (url) setMainIndex(slot); }} className={`relative aspect-[3/4] overflow-hidden rounded-[16px] border ${active ? "border-[#f5286e] ring-2 ring-[#f5286e]/25" : "border-white/70"}`}>
                      {url ? (
                        <>
                          <img src={url} alt={`Portrait ${slot + 1}`} className="h-full w-full object-cover" />
                          {active && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full brand-gradient text-white"><Check size={11} /></span>}
                        </>
                      ) : (
                        <span className={`grid h-full w-full place-items-center ${busy ? "shimmer" : "bg-white/40"}`}>{busy ? <Loader2 size={16} className="animate-spin text-[#c60f4d]" /> : <Camera size={18} className="text-[#c98da2]" />}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {progress && <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#a33b5e]"><Loader2 size={11} className="animate-spin" />{progress}</p>}
              <Button full variant="soft" className="mt-3" disabled={busy || !name.trim()} onClick={() => void generate()}>
                {busy ? <><Loader2 size={16} className="animate-spin" />Developing…</> : <><Wand2 size={16} />{photos.length ? "Regenerate portraits" : "Generate 3 portraits"}</>}
              </Button>
              {photos.length > 0 && <p className="mt-2 text-center text-[9.5px] text-[#8a596b]">Tap a photo to make it their profile picture. Tap their photo in the header to see it full-size after you chat.</p>}
              {!photos.length && <p className="mt-2 text-center text-[9.5px] text-[#8a596b]">No photo studio? No problem — you can skip this and add photos later.</p>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="font-display text-[24px] font-semibold leading-tight text-[#34101d]">Who are they,<br />underneath?</h2>
              <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-white/50 p-3">
                <Avatar character={preview} size={58} />
                <div className="min-w-0">
                  <strong className="block font-display text-[15px] font-semibold text-[#34101d]">{preview.name}</strong>
                  <p className="truncate text-[10.5px] text-[#8a596b]">{preview.tagline}</p>
                </div>
              </div>

              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Personality · pick 2–4</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{PERSONALITY.map((chip) => <Chip key={chip} size="sm" selected={personality.includes(chip)} onClick={() => setPersonality((items) => items.includes(chip) ? items.filter((item) => item !== chip) : [...items, chip].slice(0, 4))}>{chip}</Chip>)}</div>

              <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Their voice</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{VOICE_PRESETS.map((preset) => <Chip key={preset.name} size="sm" selected={voiceName === preset.name} onClick={() => { setVoiceName(preset.name); setVoice(preset.description); }}>{preset.name}</Chip>)}</div>
              <div className="glass mt-2 flex items-center gap-2 rounded-[18px] p-2.5">
                <button type="button" aria-label="Preview voice" onClick={previewVoice} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full brand-gradient text-white"><Volume2 size={17} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#34101d]">{voiceName} · {voice}</p>
                  <p className="text-[9px] text-[#8a596b]">Tap to hear a line. GPU voice falls back to your browser.</p>
                </div>
              </div>

              <label className="glass mt-4 flex items-start gap-3 rounded-[18px] p-3.5">
                <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#f5286e]" />
                <span className="text-[11px] leading-relaxed text-[#6f4254]"><strong className="block text-[12px] font-semibold text-[#34101d]">Share to Discover</strong>Let other Cookie people meet them. You can turn this off anytime.</span>
              </label>

              {error && <p className="mt-3 text-center text-[10.5px] font-semibold text-[#c60f4d]">{error}</p>}
            </motion.div>
          )}
        </section>

        <div className="shrink-0 px-5 pb-[max(14px,env(safe-area-inset-bottom))]">
          {step < 2 ? (
            <Button full size="lg" disabled={!canNext || busy} onClick={() => { if (!canNext) { setError("Give them a name first."); return; } setStep(step + 1); }}>
              {step === 0 ? "Next: their look" : "Next: their soul"} <ArrowRight size={16} />
            </Button>
          ) : (
            <Button full size="lg" disabled={busy || personality.length === 0} onClick={save}>
              <Sparkles size={17} />Bring {name.trim() || "them"} to life
            </Button>
          )}
          {error && step < 2 && <p className="mt-2 text-center text-[10px] font-semibold text-[#c60f4d]">{error}</p>}
        </div>
      </main>

    </WScreen>
  );
}
