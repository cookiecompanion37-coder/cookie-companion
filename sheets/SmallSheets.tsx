"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie } from "@/components/ui/Cookie";
import { CRISIS_RESOURCES } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { useNav } from "@/lib/nav";
import { resetAll } from "@/lib/store";

const REPORT_REASONS = ["Inappropriate content", "Impersonation", "Harassment", "Something else"];
export function ReportSheet({ characterId }: { characterId?: string }): React.JSX.Element {
  const [reason, setReason] = useState(REPORT_REASONS[0] ?? "Something else"); const nav = useNav(); const { toast } = useToast();
  return <div className="pb-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-danger/10 text-danger"><AlertTriangle size={21}/></span><div><h2 className="font-display font-bold">Report this character</h2><p className="text-xs text-choc-soft">This report will not be sent from this preview.</p></div></div><p className="mt-4 text-sm font-bold">What would you like us to know?</p><div className="mt-2 space-y-2">{REPORT_REASONS.map((item) => <label key={item} className="flex min-h-11 items-center gap-3 rounded-xl bg-white/60 px-3 text-sm"><input type="radio" checked={reason === item} onChange={() => setReason(item)} name="report-reason" className="accent-[#E87BAF]"/>{item}</label>)}</div><Button full className="mt-4" onClick={() => { toast("Thanks for helping keep Cookie thoughtful", "🛡️"); nav.closeSheet(); }}>{characterId ? "Send report" : "Continue"}</Button></div>;
}
export function OutOfMinutesSheet(): React.JSX.Element {
  const nav = useNav();
  return <div className="flex flex-col items-center pb-3 text-center"><Cookie size={92} mood="sad" bites={3}/><h2 className="mt-2 font-display text-2xl font-bold">Cookie has to go for now</h2><p className="mt-2 max-w-xs text-sm leading-relaxed text-choc-soft">You can come back when your minutes refill, or add a call pack if you&apos;d like.</p><Button full className="mt-5" onClick={() => nav.openSheet({ name: "paywall" })}>Keep talking</Button><button type="button" onClick={() => nav.closeSheet()} className="mt-2 min-h-11 px-4 text-sm font-bold text-choc-soft">See you tomorrow</button></div>;
}
export function DeleteDataSheet(): React.JSX.Element {
  const nav = useNav();
  const erase = () => { resetAll(); nav.closeSheet(); nav.setTab("chats"); };
  return <div className="flex flex-col items-center pb-3 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-danger/10 text-danger"><Trash2 size={23}/></span><h2 className="mt-3 font-display text-xl font-bold">Delete all your data?</h2><p className="mt-2 text-sm leading-relaxed text-choc-soft">This removes local chats, companions, memories, settings, and call history from this device. You can start fresh any time.</p><Button full variant="danger" className="mt-5" onClick={erase}>Delete everything</Button><button type="button" onClick={() => nav.closeSheet()} className="mt-2 min-h-11 text-sm font-bold text-choc-soft">Keep my data</button></div>;
}
export function MinorGateSheet(): React.JSX.Element {
  const nav = useNav();
  const leave = () => { resetAll(); nav.closeSheet(); nav.setTab("chats"); };
  return <div className="flex flex-col items-center pb-3 text-center"><Cookie size={90} mood="sad" bites={1}/><h2 className="mt-3 font-display text-xl font-bold">Cookie is for adults</h2><p className="mt-2 text-sm leading-relaxed text-choc-soft">Thanks for being honest. This experience is only available to people 18 and older. Please talk with a trusted adult if you need support.</p><Button full className="mt-5" onClick={leave}>Back to safety</Button></div>;
}
export function SafetySheet(): React.JSX.Element {
  return <div className="pb-3"><div className="flex items-center gap-3 rounded-[20px] bg-ok/10 p-4"><ShieldCheck size={22} className="text-ok"/><div><h2 className="font-display font-bold">You deserve real support</h2><p className="text-xs text-choc-soft">Cookie is an AI companion, not a crisis service.</p></div></div><p className="mt-4 text-sm leading-relaxed text-choc-soft">If you might be in immediate danger, contact local emergency services or someone you trust now. These free resources can help you find a person to talk with:</p><div className="mt-3 space-y-2">{CRISIS_RESOURCES.map((resource) => <div key={resource.label} className="rounded-[18px] bg-white/70 p-3"><strong className="text-sm">{resource.label}</strong><p className="mt-1 text-xs leading-relaxed text-choc-soft">{resource.detail}</p>{resource.label === "findahelpline.com" && <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="mt-1 inline-block min-h-11 text-xs font-bold text-choc underline">Open support finder</a>}</div>)}</div><p className="mt-3 text-[10px] text-choc-soft/75">If a resource is not available in your area, search for a local crisis line or emergency number.</p></div>;
}
