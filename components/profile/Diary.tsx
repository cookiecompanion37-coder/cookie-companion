"use client";

import { useState } from "react";
import useSWR from "swr";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Entry = { id: string; title: string; body: string; mood: string; created_at: string };
const fetcher = async (url: string): Promise<{ entries: Entry[] }> => { const r = await fetch(url); if (!r.ok) throw new Error("Could not load your diary"); return r.json(); };
export function Diary() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState("reflective");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data, error: loadError, mutate, isLoading } = useSWR(open ? "/api/diaries" : null, fetcher);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/diaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, mood }) }); if (!r.ok) throw new Error("Could not save entry. Try again."); setTitle(""); setBody(""); await mutate(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setError("");
    try { const r = await fetch(`/api/diaries?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok) throw new Error("Could not delete entry"); await mutate(); } catch { setError("Could not delete entry. Try again."); }
  }
  return <section className="card mt-3 rounded-[24px] p-4">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left"><BookOpen size={20} className="text-[#b34d70]"/><span className="flex-1"><strong className="block font-display text-[16px]">My diary</strong><small className="text-[#825867]">A private place to leave a little of your day.</small></span><Plus size={18}/></button>
    {open && <div className="mt-4"><form onSubmit={save} className="space-y-3">
      <label className="block text-[11px] font-semibold">A title for today<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadde1] bg-[#fffafb] p-3 outline-none focus:border-[#b34d70]" placeholder="The little things"/></label>
      <label className="block text-[11px] font-semibold">Your reflection<textarea required maxLength={10000} rows={4} value={body} onChange={e => setBody(e.target.value)} className="mt-1 w-full resize-y rounded-xl border border-[#eadde1] bg-[#fffafb] p-3 outline-none focus:border-[#b34d70]" placeholder="What is on your mind?"/></label>
      <label className="flex items-center gap-3 text-[12px]">Feeling<select value={mood} onChange={e => setMood(e.target.value)} className="rounded-lg border border-[#eadde1] bg-white p-2">{["reflective", "happy", "grateful", "low", "hopeful"].map(m => <option key={m}>{m}</option>)}</select></label>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save this moment"}</Button>
    </form>
    {(error || loadError) && <p role="alert" className="mt-3 text-[12px] text-[#a6234b]">{error || "Could not load entries. Please try again."}</p>}
    {isLoading && <p className="mt-4 text-[12px] text-[#825867]">Opening your diary…</p>}
    {!isLoading && data?.entries.length === 0 && <p className="mt-5 text-[12px] text-[#825867]">A fresh page. Your first moment starts here.</p>}
    <div className="mt-5 space-y-3">{data?.entries.map(entry => <article key={entry.id} className="border-t border-[#eadde1] pt-4"><div className="flex items-start gap-2"><div className="flex-1"><p className="text-[10px] uppercase tracking-wider text-[#966377]">{new Date(entry.created_at).toLocaleDateString()} · {entry.mood}</p><h3 className="mt-1 font-display text-[17px]">{entry.title}</h3></div><button type="button" onClick={() => void remove(entry.id)} aria-label={`Delete ${entry.title}`} className="p-2 text-[#966377]"><Trash2 size={15}/></button></div><p className="selectable mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#825867]">{entry.body}</p></article>)}</div>
    </div>}
  </section>;
}
