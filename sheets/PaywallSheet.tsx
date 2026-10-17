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
  const nav = useNav();
  const { toast } = useToast();
  const [annual, setAnnual] = useState(false);
  const purchase = (plan: PlanId) => {
    setState((current) => ({ ...current, plan }));
    toast(`${PLANS[plan].name} is ready to explore`, "🍪");
    nav.closeSheet();
  };
  const buyPack = (minutes: number) => { setState((current) => ({ ...current, credits: { ...current.credits, packCallSeconds: current.credits.packCallSeconds + minutes * 60 } })); toast(`${minutes} call minutes added`, "📞"); };

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#fff0f4] p-3.5">
        <Cookie size={58} mood="blush" bites={2} />
        <div className="flex-1">
          <h2 className="font-display text-[17px] font-semibold text-[#34101d]">A little more room?</h2>
          <p className="text-[10.5px] leading-snug text-[#8a596b]">Pick the pace that feels right for you.</p>
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-fit rounded-full bg-[#f6e6ec] p-1">
        <button type="button" onClick={() => setAnnual(false)} className={`min-h-9 rounded-full px-4 text-[11px] font-bold ${!annual ? "bg-white text-[#34101d] shadow" : "text-[#8a596b]"}`}>Monthly</button>
        <button type="button" onClick={() => setAnnual(true)} className={`min-h-9 rounded-full px-4 text-[11px] font-bold ${annual ? "bg-white text-[#34101d] shadow" : "text-[#8a596b]"}`}>Annual · save 40%</button>
      </div>

      <div className="mt-4 space-y-2.5">
        {(["plus", "max"] as PlanId[]).map((plan) => {
          const details = PLANS[plan];
          const price = annual ? details.priceAnnual : details.priceMonthly;
          return (
            <div key={plan} className={`relative rounded-[22px] border p-3.5 ${plan === "plus" ? "border-transparent bg-[linear-gradient(150deg,#fff3f7,#ffe1ec_55%,#f1e8ff)] shadow-[0_16px_30px_-20px_rgba(206,115,172,.6)]" : "border-white/80 bg-white/60"}`}>
              {plan === "plus" && <span className="absolute -top-2.5 right-3 rounded-full brand-gradient px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white shadow">most loved</span>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/80">{plan === "plus" ? <Heart size={16} className="text-[#f5286e]" /> : <Crown size={16} className="text-[#dd9440]" />}</span>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-[#34101d]">{details.name}</h3>
                    <p className="text-[9.5px] text-[#8a596b]">{plan === "plus" ? "for everyday moments" : "for your most curious days"}</p>
                  </div>
                </div>
                <p className="font-display text-[19px] font-semibold text-[#34101d]">${price.toFixed(2)}<span className="text-[9px] font-medium text-[#8a596b]">/{annual ? "yr" : "mo"}</span></p>
              </div>
              <ul className="mt-2 space-y-0.5">{details.perks.map((perk) => <li key={perk} className="flex items-center gap-1.5 text-[10.5px] text-[#8a596b]"><Check size={11} className="text-[#45b98a]" />{perk}</li>)}</ul>
              <Button full size="sm" className="mt-2.5" onClick={() => purchase(plan)}><Sparkles size={13} />Choose {details.name}</Button>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <h3 className="font-display text-[14px] font-semibold text-[#34101d]">Call minutes that never expire</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PACKS.map((pack) => (
            <button key={pack.minutes} type="button" onClick={() => buyPack(pack.minutes)} className="press rounded-[16px] border border-white/70 bg-white/60 p-2.5 text-center">
              <span className="block font-display text-[13px] font-semibold text-[#34101d]">{pack.minutes} min</span>
              <span className="text-[10px] text-[#8a596b]">${pack.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[9px] leading-relaxed text-[#a97c8b]">Demo billing only — plans unlock instantly on this device. No payment is taken.</p>
    </div>
  );
}
