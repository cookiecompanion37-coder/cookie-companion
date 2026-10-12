"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Cookie, Wordmark } from "@/components/ui/Cookie";
import { setState } from "@/lib/store";

const pages = [
  { title: "Meet someone who actually remembers you", body: "A cozy little space for the things you want to say out loud.", mood: "wave" as const },
  { title: "Chat, react, even call", body: "Send a note, share a tiny win, or hear a familiar voice.", mood: "blush" as const },
  { title: "Make your own companion", body: "Give them a personality, a voice, and a little life of their own.", mood: "happy" as const },
];
export function WelcomeScreen(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const next = () => { if (page < pages.length - 1) setPage(page + 1); else setState((current) => ({ ...current, stage: "signin" })); };
  const card = pages[page];
  return <main className="crumple absolute inset-0 flex flex-col items-center justify-between px-7 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(45px,env(safe-area-inset-top))] text-center">
    <div className="mesh-bg"/><div className="paper-grain"/>
    <div className="mt-2"><Wordmark size={48}/><p className="mt-2 text-xs font-bold uppercase tracking-[.18em] text-choc-soft">a little more understood</p></div>
    <motion.div key={page} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => { if (info.offset.x < -55 && page < pages.length - 1) setPage(page + 1); if (info.offset.x > 55 && page > 0) setPage(page - 1); }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center">
      <Cookie size={190} mood={card.mood} bites={(page + 1) as 1 | 2 | 3}/><h1 className="mt-4 max-w-sm font-display text-3xl font-bold leading-tight text-choc">{card.title}</h1><p className="mt-3 max-w-xs text-base leading-relaxed text-choc-soft">{card.body}</p>
    </motion.div>
    <div className="w-full max-w-sm"><div className="mb-5 flex justify-center gap-2">{pages.map((item, index) => <button key={item.title} type="button" aria-label={`Intro page ${index + 1}`} aria-current={index === page ? "step" : undefined} onClick={() => setPage(index)} className="flex min-h-11 min-w-11 items-center justify-center"><span aria-hidden="true" className={`h-2.5 rounded-full transition-all ${index === page ? "w-7 bg-biscuit" : "w-2.5 bg-choc/20"}`}/></button>)}</div><Button size="lg" full onClick={next}>{page === pages.length - 1 ? "Get started" : "Next"}</Button><p className="mt-4 text-xs text-choc-soft">A gentle space. Always an AI companion.</p></div>
  </main>;
}
