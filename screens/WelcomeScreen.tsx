"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/ui/Cookie";
import { setState } from "@/lib/store";

const pages = [
  { title: "Meet someone who actually remembers you", body: "A cozy little space for the things you want to say out loud." },
  { title: "Chat, react, even call", body: "Send a note, share a tiny win, or hear a familiar voice." },
  { title: "Make your own companion", body: "Give them a personality, a voice, and a little life of their own." },
];
export function WelcomeScreen(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const next = () => { if (page < pages.length - 1) setPage(page + 1); else setState((current) => ({ ...current, stage: "signin" })); };
  const card = pages[page];
  return <main className="absolute inset-0 flex flex-col items-center px-7 pb-[max(26px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-center">
    <div className="mesh-bg"/><div className="paper-grain"/>
    <div className="flex w-full flex-1 items-center justify-center">
      <motion.div key={`art-${page}`} initial={{ scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 22 }}>
        <BrandLockup height={205} float className="max-h-[36vh]"/>
      </motion.div>
    </div>
    <motion.div key={page} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => { if (info.offset.x < -55 && page < pages.length - 1) setPage(page + 1); if (info.offset.x > 55 && page > 0) setPage(page - 1); }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="mt-4 flex flex-col items-center">
      <h1 className="max-w-sm font-display text-[27px] font-bold leading-tight text-choc">{card.title}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-choc-soft">{card.body}</p>
    </motion.div>
    <div className="mt-5 w-full max-w-sm">
      <div className="mb-4 flex justify-center gap-2">{pages.map((item, index) => <button key={item.title} type="button" aria-label={`Intro page ${index + 1}`} aria-current={index === page ? "step" : undefined} onClick={() => setPage(index)} className="flex min-h-11 min-w-11 items-center justify-center"><span aria-hidden="true" className={`h-2.5 rounded-full transition-all ${index === page ? "w-7 [background:linear-gradient(90deg,#ffb7d9,#c9b6ff)]" : "w-2.5 bg-choc/20"}`}/></button>)}</div>
      <Button size="lg" full onClick={next}>{page === pages.length - 1 ? "Get started" : "Next"}</Button>
      <p className="mt-3 text-xs text-choc-soft">A gentle space. Always an AI companion.</p>
    </div>
  </main>;
}
