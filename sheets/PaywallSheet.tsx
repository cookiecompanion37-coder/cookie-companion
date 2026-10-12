"use client";

import { useState } from "react";
import { Check, Crown, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Cookie } from "@/components/ui/Cookie";
import { PACKS, PLANS } from "@/lib/constants";
import { useNav } from "@/lib/nav";
import { setState } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import type { PlanId } from "@/lib/types";

export function PaywallSheet(): React.JSX.Element {
  const nav = useNav(); const { toast } = useToast(); const [annual, setAnnual] = useState(false);
  const purchase = (plan: PlanId) => {
    // TODO(supabase)
    setState((current) => ({ ...current, plan })); toast(`${PLANS[plan].name} is ready to explore`, "🍪"); nav.closeSheet();
  };
  const buyPack = (minutes: number) => { setState((current) => ({ ...current, credits: { ...current.credits, packCallSeconds: current.credits.packCallSeconds + minutes * 60 } })); toast(`${minutes} call minutes added`, "📞"); };
  return <div className="pb-3"><div className="flex flex-col items-center text-center"><Cookie size={76} mood="blush" bites={2}/><h2 className="mt-1 font-display text-2xl font-bold">A little more room?</h2><p className="mt-1 max-w-xs text-sm text-choc-soft">Pick the pace that feels right for you.</p></div>
    <div className="mx-auto mt-4 flex w-fit rounded-full bg-cream-2 p-1"><button type="button" onClick={() => setAnnual(false)} className={`min-h-11 rounded-full px-4 text-sm font-bold ${!annual ? "bg-white shadow" : "text-choc-soft"}`}>Monthly</button><button type="button" onClick={() => setAnnual(true)} className={`min-h-11 rounded-full px-4 text-sm font-bold ${annual ? "bg-white shadow" : "text-choc-soft"}`}>Annual · save ~40%</button></div>
    <div className="mt-4 space-y-3">{(["plus", "max"] as PlanId[]).map((plan) => {
      const details = PLANS[plan]; const price = annual ? details.priceAnnual : details.priceMonthly;
      return <div key={plan} className={`relative rounded-[24px] border p-4 ${plan === "plus" ? "border-biscuit bg-biscuit/10 shadow-md" : "border-white bg-white/65"}`}>
        {plan === "plus" && <span className="absolute -top-3 right-4 rounded-full bg-biscuit px-3 py-1 text-[10px] font-bold text-white">Most popular</span>}
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/75">{plan === "plus" ? <Heart size={18} className="text-pink"/> : <Crown size={18} className="text-biscuit-deep"/>}</span><div><h3 className="font-display text-lg font-bold">{details.name}</h3><p className="text-xs text-choc-soft">{plan === "plus" ? "For more everyday moments" : "For your most curious days"}</p></div></div><p className="font-display text-xl font-bold">${price.toFixed(2)}<span className="text-xs font-medium text-choc-soft">/{annual ? "yr" : "mo"}</span></p></div>
        <ul className="mt-3 space-y-1">{details.perks.map((perk) => <li key={perk} className="flex items-center gap-2 text-xs text-choc-soft"><Check size={14} className="text-ok"/>{perk}</li>)}</ul><Button full size="sm" className="mt-3" onClick={() => purchase(plan)}>Choose {details.name}</Button>
      </div>;
    })}</div>
    <div className="mt-5"><h3 className="font-display text-lg font-bold">Call minutes that never expire</h3><div className="mt-2 grid grid-cols-3 gap-2">{PACKS.map((pack) => <button key={pack.minutes} type="button" onClick={() => buyPack(pack.minutes)} className="clay rounded-[18px] p-3 text-center"><span className="block font-display font-bold">{pack.minutes} min</span><span className="text-xs text-choc-soft">${pack.price.toFixed(2)}</span></button>)}</div></div>
    <button type="button" onClick={() => toast("There are no purchases to restore yet", "🍪")} className="mt-4 min-h-11 w-full text-sm font-bold text-choc-soft">Restore purchase</button><p className="text-center text-[10px] text-choc-soft/75">Regional pricing applied · mock purchases for this preview</p><p className="mt-1 text-center text-[10px] text-choc-soft/75"><Sparkles size={10} className="mr-1 inline"/>No pressure — choose what works for you.</p>
  </div>;
}
