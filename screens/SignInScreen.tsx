"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { refreshAccount, setState } from "@/lib/store";

export function SignInScreen(): React.JSX.Element {
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: signup ? "signup" : "signin", name, email, password, adult }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please try again.");
      if (data.confirmationRequired) { setMessage("Check your email to confirm your account, then come back to sign in."); setSignup(false); }
      else await refreshAccount();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <WScreen><main className="relative z-10 flex h-full flex-col overflow-y-auto px-7 pb-8 pt-[max(24px,env(safe-area-inset-top))]">
    <button type="button" onClick={() => setState(s => ({ ...s, stage: "welcome" }))} aria-label="Back" className="press grid size-11 place-items-center rounded-full border border-[#eadde1] bg-white text-[#7d4a5d]"><ArrowLeft size={18} /></button>
    <div className="mb-8 mt-14"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a33b5e]">Your little corner of the world</p><h1 className="mt-4 font-display text-[36px] font-semibold leading-tight">{signup ? "Make yourself at home." : "Good to have you back."}</h1><p className="mt-3 text-[14px] leading-relaxed text-[#825867]">{signup ? "A space for good conversations and the moments in between." : "Your companions, conversations, and memories are waiting."}</p></div>
    <form onSubmit={submit} className="space-y-4">
      {signup && <label className="block text-[12px] font-semibold">Your name<input required minLength={2} maxLength={32} autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#eadde1] bg-white px-4 py-3.5 outline-none focus:border-[#c96887]" placeholder="What should we call you?" /></label>}
      <label className="block text-[12px] font-semibold">Email address<div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#eadde1] bg-white px-4 focus-within:border-[#c96887]"><Mail size={17} className="text-[#a07c89]"/><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3.5 outline-none" placeholder="you@example.com" /></div></label>
      <label className="block text-[12px] font-semibold">Password<div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#eadde1] bg-white px-4 focus-within:border-[#c96887]"><Lock size={17} className="text-[#a07c89]"/><input required type="password" minLength={8} maxLength={128} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3.5 outline-none" placeholder="At least 8 characters" /></div></label>
      {signup && <label className="flex items-start gap-3 py-1 text-[12px] leading-relaxed text-[#825867]"><input required type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} className="mt-1 size-4 accent-[#b34d70]"/>I am 18 or older and understand that companions are fictional AI characters.</label>}
      {error && <p role="alert" className="rounded-xl bg-[#fff0f2] p-3 text-[12px] text-[#a6234b]">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-[#edf5ef] p-3 text-[12px] text-[#356b48]">{message}</p>}
      <Button full size="lg" disabled={busy} type="submit">{busy ? "One moment…" : signup ? "Create account" : "Sign in"}<ArrowRight size={17}/></Button>
    </form>
    <p className="mt-6 text-center text-[12px] text-[#825867]">{signup ? "Already have an account?" : "New around here?"} <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(""); setMessage(""); }} className="font-bold text-[#a33b5e] underline underline-offset-4">{signup ? "Sign in" : "Create an account"}</button></p>
    <p className="mt-auto flex items-center justify-center gap-2 pt-10 text-[10px] text-[#966377]"><Lock size={12}/>Private account · securely saved</p>
  </main></WScreen>;
}
