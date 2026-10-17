"use client";

import { motion } from "framer-motion";
import { MessageCircle, PhoneCall, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/ui/Cookie";
import { setState } from "@/lib/store";
import { WScreen } from "@/components/ui/WallpaperBg";

const features = [
  { icon: MessageCircle, title: "Someone who remembers", body: "Little details, saved quietly for next time." },
  { icon: Sparkles, title: "Photos & small moments", body: "Selfies, mirror pics, the view from their day." },
  { icon: PhoneCall, title: "Voice calls that feel close", body: "Hear their voice whenever you want to talk." },
];

export function WelcomeScreen(): React.JSX.Element {
  const begin = () => setState((state) => ({ ...state, stage: "signin" }));
  return (
    <WScreen>
      <main className="relative z-10 flex h-full flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a33b5e] backdrop-blur-md">AI companion · 18+</span>
          <button type="button" onClick={begin} className="min-h-10 px-2 text-[12px] font-bold text-[#a33b5e]">Sign in</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-3">
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 22 }}>
            <BrandLockup height="clamp(112px, 16.5vh, 168px)" float />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }} className="mt-6 flex flex-col items-center text-center">
            <h1 className="max-w-[300px] font-display text-[30px] font-semibold leading-[1.12] text-[#34101d]">
              Someone who remembers the <span className="candy-text">little things</span>
            </h1>
            <p className="mt-2.5 max-w-[280px] text-[13.5px] leading-relaxed text-[#7d4a5d]">A cozy place for the things you want to say out loud — and someone sweet to say them to.</p>
          </motion.div>
        </div>

        <div className="space-y-2.5">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + index * 0.08 }} className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(150deg,#ffd9e5,#ffb4cb)] text-[#c60f4d]"><Icon size={18} /></span>
                <span className="min-w-0">
                  <strong className="block font-display text-[14px] font-semibold">{feature.title}</strong>
                  <small className="block text-[11.5px] leading-snug text-[#8a596b]">{feature.body}</small>
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-3 shrink-0">
          <Button full size="lg" onClick={begin}>Get started</Button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-[#966377]">Cookie companions are fictional AI characters. You must be 18 or older.</p>
        </div>
      </main>
    </WScreen>
  );
}
