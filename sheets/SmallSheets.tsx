"use client";

import { useState } from "react";
import { AlertTriangle, Check, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie } from "@/components/ui/Cookie";
import { CRISIS_RESOURCES, INTERESTS, VIBES } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { useNav } from "@/lib/nav";
import { resetAll, setState, signOut, useAppState } from "@/lib/store";

const REPORT_REASONS = ["Inappropriate content", "Impersonation", "Harassment", "Something else"];
export function ReportSheet({ characterId }: { characterId?: string }): React.JSX.Element {
  const [reason, setReason] = useState(REPORT_REASONS[0] ?? "Something else");
  const nav = useNav();
  const { toast } = useToast();
  return (
    <div className="pb-2">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#ffe3e8] text-[#e5395c]"><AlertTriangle size={19} /></span>
        <div><h2 className="font-display text-[14px] font-semibold text-[#34101d]">Report this character</h2><p className="text-[10px] text-[#8a596b]">This preview won&apos;t send anything yet.</p></div>
      </div>
      <p className="mt-4 text-[12px] font-semibold text-[#34101d]">What would you like us to know?</p>
      <div className="mt-2 space-y-1.5">
        {REPORT_REASONS.map((item) => (
          <label key={item} className="flex min-h-11 items-center gap-3 rounded-[14px] bg-white/60 px-3 text-[12px] text-[#4c1d2d]">
            <input type="radio" checked={reason === item} onChange={() => setReason(item)} name="report-reason" className="accent-[#f5286e]" />{item}
          </label>
        ))}
      </div>
      <Button full className="mt-4" onClick={() => { toast("Thanks for helping keep Cookie thoughtful", "🛡️"); nav.closeSheet(); }}>{characterId ? "Send report" : "Continue"}</Button>
    </div>
  );
}

export function OutOfMinutesSheet(): React.JSX.Element {
  const nav = useNav();
  return (
    <div className="flex flex-col items-center pb-2 text-center">
      <Cookie size={84} mood="sad" bites={3} />
      <h2 className="mt-2 font-display text-[21px] font-semibold text-[#34101d]">Cookie has to go for now</h2>
      <p className="mt-1.5 max-w-[270px] text-[12px] leading-relaxed text-[#8a596b]">Come back when your minutes refill, or add a call pack if you&apos;d like.</p>
      <Button full className="mt-4" onClick={() => nav.openSheet({ name: "paywall" })}>Keep talking</Button>
      <button type="button" onClick={() => nav.closeSheet()} className="mt-2 min-h-10 px-4 text-[11px] font-bold text-[#8a596b]">See you tomorrow</button>
    </div>
  );
}

export function DeleteDataSheet(): React.JSX.Element {
  const nav = useNav();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const erase = async () => { setBusy(true); try { await resetAll(); nav.closeSheet(); nav.setTab("chats"); } catch { toast("Could not delete saved data. Please try again."); } finally { setBusy(false); } };
  return (
    <div className="flex flex-col items-center pb-2 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ffe3e8] text-[#e5395c]"><Trash2 size={21} /></span>
      <h2 className="mt-3 font-display text-[19px] font-semibold text-[#34101d]">Delete all your data?</h2>
      <p className="mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-[#8a596b]">This permanently removes your saved chats, private companions, diary, memories, settings, and call history from your account, then signs you out. Your login and previously shared public content remain.</p>
      <Button full variant="danger" className="mt-4" disabled={busy} onClick={() => void erase()}>{busy ? "Deleting…" : "Delete saved data"}</Button>
      <button type="button" onClick={() => nav.closeSheet()} className="mt-2 min-h-10 text-[11px] font-bold text-[#8a596b]">Keep my data</button>
    </div>
  );
}

export function MinorGateSheet(): React.JSX.Element {
  const nav = useNav();
  const leave = () => { void signOut().then(() => { nav.closeSheet(); nav.setTab("chats"); }); };
  return (
    <div className="flex flex-col items-center pb-2 text-center">
      <Cookie size={86} mood="sad" bites={1} />
      <h2 className="mt-3 font-display text-[19px] font-semibold text-[#34101d]">Cookie is for adults</h2>
      <p className="mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-[#8a596b]">Thanks for being honest. This experience is only for people 18 and older. Please talk with a trusted adult if you need support.</p>
      <Button full className="mt-4" onClick={leave}>Back to safety</Button>
    </div>
  );
}

export function SafetySheet(): React.JSX.Element {
  return (
    <div className="pb-2">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#e9f8f1] p-3.5">
        <ShieldCheck size={21} className="text-[#45b98a]" />
        <div><h2 className="font-display text-[14px] font-semibold text-[#34101d]">You deserve real support</h2><p className="text-[10px] text-[#8a596b]">Cookie is an AI companion, not a crisis service.</p></div>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-[#5c2a3b]">If you might be in immediate danger, contact local emergency services or someone you trust now. These free resources can help you reach a person:</p>
      <div className="mt-3 space-y-2">
        {CRISIS_RESOURCES.map((resource) => (
          <div key={resource.label} className="rounded-[16px] bg-white/60 p-3">
            <strong className="text-[12px] text-[#34101d]">{resource.label}</strong>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#8a596b]">{resource.detail}</p>
            {resource.label === "findahelpline.com" && <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10.5px] font-bold text-[#c60f4d] underline">Open support finder</a>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9px] text-[#a97c8b]">If a resource isn&apos;t available in your area, search for a local crisis line or emergency number.</p>
    </div>
  );
}

export function EditProfileSheet(): React.JSX.Element {
  const state = useAppState();
  const nav = useNav();
  const { toast } = useToast();
  const [name, setName] = useState(state.session?.name ?? "");
  const [email, setEmail] = useState(state.session?.email ?? "");
  const [vibe, setVibe] = useState(state.session?.vibe ?? "Cozy");
  const [interests, setInterests] = useState<string[]>(state.session?.interests ?? []);
  const toggle = (interest: string) => setInterests((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest].slice(0, 5));
  const save = () => {
    setState((current) => ({ ...current, session: { name: name.trim() || "friend", email: email.trim(), vibe, interests } }));
    toast("Profile updated", "✨");
    nav.closeSheet();
  };
  return (
    <div className="pb-2">
      <label className="glass block rounded-[18px] px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Your name</span>
        <input value={name} maxLength={32} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-transparent text-[16px] text-[#34101d] outline-none" />
      </label>
      <label className="glass mt-2 block rounded-[18px] px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a33b5e]">Email</span>
        <input value={email} inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1 w-full bg-transparent text-[16px] text-[#34101d] outline-none placeholder:text-[#a97c8b]/60" />
      </label>
      <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Your vibe</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">{VIBES.map((item) => <button key={item} type="button" onClick={() => setVibe(item)} className={`press rounded-full px-3 py-1.5 text-[10.5px] font-semibold ${vibe === item ? "brand-gradient text-white" : "bg-white/60 text-[#8a596b]"}`}>{item}</button>)}</div>
      <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">Into</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">{INTERESTS.map((item) => <button key={item} type="button" onClick={() => toggle(item)} className={`press rounded-full px-3 py-1.5 text-[10.5px] font-semibold ${interests.includes(item) ? "brand-gradient text-white" : "bg-white/60 text-[#8a596b]"}`}>{item}</button>)}</div>
      <Button full className="mt-4" onClick={save}><Check size={15} />Save profile</Button>
    </div>
  );
}
