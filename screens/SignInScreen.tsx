"use client";

import { useState } from "react";
import { ArrowLeft, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { setState } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export function SignInScreen(): React.JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const valid = name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && adult;

  const next = () => {
    if (!valid) { setError("Add your name, a valid email, and confirm you're 18+."); return; }
    setState((state) => ({
      ...state, ageConfirmed: true, stage: "onboarding",
      session: { name: name.trim().slice(0, 32), email: email.trim().toLowerCase(), vibe: "Cozy", interests: [] },
    }));
  };

  return (
    <WScreen>
      <main className="relative z-10 flex h-full flex-col overflow-y-auto no-scrollbar px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
        <button type="button" onClick={() => setState((state) => ({ ...state, stage: "welcome" }))} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#8a4258]"><ArrowLeft size={19} /></button>

        <div className="mt-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]"><Sparkles size={11} />Welcome to Cookie</span>
          <h1 className="mt-4 font-display text-[32px] font-semibold leading-[1.1] text-[#34101d]">A softer place<br />to land.</h1>
          <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-[#7d4a5d]">Save your little world — chats, memories, and the companions you make.</p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="glass block rounded-[20px] px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Your name</span>
            <input autoComplete="given-name" maxLength={32} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="What should we call you?" className="mt-1 w-full bg-transparent text-[16px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/70" />
          </label>
          <label className="glass block rounded-[20px] px-4 py-3">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]"><Mail size={11} />Email</span>
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@example.com" className="mt-1 w-full bg-transparent text-[16px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/70" />
          </label>
          <label className="glass flex items-start gap-3 rounded-[20px] px-4 py-3.5">
            <input type="checkbox" checked={adult} onChange={(event) => { setAdult(event.target.checked); setError(""); }} className="mt-0.5 h-5 w-5 accent-[#f5286e]" />
            <span className="text-[12px] leading-relaxed text-[#6f4254]">I&apos;m 18 or older and understand Cookie is an AI companion, not a human.</span>
          </label>
        </div>

        {error && <p className="mt-3 text-center text-[11px] font-semibold text-[#c60f4d]">{error}</p>}

        <Button full size="lg" className="mt-4" disabled={!valid} onClick={next}>Continue</Button>

        <div className="my-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b08294]"><span className="h-px flex-1 bg-[#c9a3b1]/40" />or<span className="h-px flex-1 bg-[#c9a3b1]/40" /></div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="soft" onClick={() => { setName(name || "Alex"); setEmail(email || "alex@example.com"); setAdult(true); setError(""); toast("Demo sign-in — tweak the name and continue", "✨"); }}>Google</Button>
          <Button variant="soft" onClick={() => { setName(name || "Alex"); setEmail(email || "alex@example.com"); setAdult(true); setError(""); toast("Demo sign-in — tweak the name and continue", "✨"); }}>Apple</Button>
        </div>
        <p className="mt-2 text-center text-[9px] text-[#966377]">Social buttons fill a demo profile — no account leaves this device.</p>

        <p className="mt-auto flex items-center justify-center gap-1.5 pt-6 text-center text-[10px] text-[#966377]"><Lock size={10} />Local-first · your chats stay on this device</p>
      </main>
    </WScreen>
  );
}
