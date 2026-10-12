"use client";

import { useRef, useState } from "react";
import type { ClipboardEvent, ChangeEvent } from "react";
import { Apple, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie, Wordmark } from "@/components/ui/Cookie";
import { setState } from "@/lib/store";

export function SignInScreen(): React.JSX.Element {
  const [ageConfirmed, setAgeConfirmed] = useState(false); const [phoneMode, setPhoneMode] = useState(false); const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const continueToApp = () => {
    if (!ageConfirmed) return;
    // TODO(supabase)
    setState((state) => ({ ...state, ageConfirmed: true, session: { name: "", vibe: "", interests: [] }, stage: "onboarding" }));
  };
  const updateOtp = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((item, position) => position === index ? digit : item));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };
  const pasteOtp = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length) { event.preventDefault(); setOtp(Array.from({ length: 6 }, (_, index) => digits[index] ?? "")); inputs.current[Math.min(digits.length, 5)]?.focus(); }
  };
  const changeOtp = (index: number) => (event: ChangeEvent<HTMLInputElement>) => updateOtp(index, event.target.value);
  const canContinue = ageConfirmed && (!phoneMode || otp.join("").length === 6);
  return <main className="absolute inset-0 flex flex-col items-center overflow-y-auto px-7 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(34px,env(safe-area-inset-top))] text-center">
    <div className="mesh-bg"/><div className="paper-grain"/><Cookie size={102} mood="wave" bites={2}/><div className="mt-1"><Wordmark size={43}/></div>
    <h1 className="mt-4 font-display text-2xl font-bold">A softer place to land</h1><p className="mt-2 max-w-xs text-sm leading-relaxed text-choc-soft">Make a little room for conversation, creativity, and company.</p>
    {!phoneMode ? <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
      <Button full variant="clay" disabled={!ageConfirmed} onClick={continueToApp}><Sparkles size={17}/>Continue with Google</Button>
      <Button full variant="clay" disabled={!ageConfirmed} onClick={continueToApp}><Apple size={18} fill="currentColor"/>Continue with Apple</Button>
      <Button full variant="clay" disabled={!ageConfirmed} onClick={() => setPhoneMode(true)}><Phone size={17}/>Continue with phone</Button>
    </div> : <div className="mt-6 w-full max-w-sm rounded-[26px] bg-white/60 p-4 text-left"><label htmlFor="phone" className="text-sm font-bold">Phone number</label><input id="phone" type="tel" placeholder="+1 555 000 0000" className="mt-2 min-h-12 w-full rounded-2xl border border-white bg-white/80 px-4 outline-none"/><p className="mt-4 text-sm font-bold">Enter your 6-digit code</p><div className="mt-2 flex justify-between gap-2">{otp.map((digit, index) => <input key={index} ref={(node) => { inputs.current[index] = node; }} aria-label={`Code digit ${index + 1}`} inputMode="numeric" maxLength={1} value={digit} onChange={changeOtp(index)} onPaste={pasteOtp} className="h-12 w-11 rounded-xl border border-white bg-white text-center text-lg font-bold outline-none focus:ring-2 focus:ring-biscuit"/>)}</div><button type="button" onClick={() => setPhoneMode(false)} className="mt-3 min-h-11 text-xs font-bold text-choc-soft">Use another sign-in option</button></div>}
    <label className="mt-6 flex w-full max-w-sm items-start gap-3 rounded-[20px] bg-white/55 p-4 text-left text-sm leading-snug"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#D9902B]"/><span>I&apos;m 18 or older and understand Cookie is an AI, not a human.</span></label>
    <Button size="lg" full disabled={!canContinue} className="mt-4 max-w-sm" onClick={continueToApp}>Continue</Button>
    <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-choc-soft/80">By continuing, you agree to our Terms and Privacy Policy. Cookie is an AI companion and not a substitute for professional care.</p>
  </main>;
}
