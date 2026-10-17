"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Check, CircleAlert, Clock3, Image, Loader2, LogOut, PhoneCall, Plus, Sparkles, Users, Wand2, X,
} from "lucide-react";

/**
 * Cookie Studio.
 *
 * A single internal screen: sign in with email + passcode, then create personas
 * in batches, watch the AI story budget and push the cron by hand. Deliberately
 * boring tech (one cookie, one fetch per section) so it costs nothing to host.
 */

interface Stats {
  email: string;
  defaults: boolean;
  db: boolean;
  personas: { total: number; ai: number; publicCount: number; remaining: number; cap: number };
  stories: { configured: boolean; today: number; cap: number; lastAt: number; nextAt: number; planned: number; inFlight: number; scenes: number };
  calls: { configured: boolean; capacity: number; used: number; free: number };
}

const BANDS = [
  { id: "18-24", label: "18–24" },
  { id: "25-34", label: "25–34" },
  { id: "35-49", label: "35–49" },
] as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[22px] border border-white bg-white/85 p-4 shadow-[0_18px_40px_-30px_rgba(120,10,50,.55)] ${className}`}>{children}</section>;
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#a33b5e]">{icon} {label}</div>
      <p className="mt-2 font-display text-[26px] font-semibold leading-none text-[#34101d]">{value}</p>
      {hint && <p className="mt-1 text-[11px] font-medium text-[#8a596b]">{hint}</p>}
    </Card>
  );
}

export default function AdminPage(): React.JSX.Element {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [defaults, setDefaults] = useState(false);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [count, setCount] = useState(6);
  const [female, setFemale] = useState(3);
  const [male, setMale] = useState(3);
  const [nonbinary, setNonbinary] = useState(0);
  const [band, setBand] = useState<(typeof BANDS)[number]["id"]>("25-34");
  const [busy, setBusy] = useState<"" | "login" | "personas" | "story" | "calls">("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      if (response.status === 401) { setSignedIn(false); setStats(null); return; }
      if (!response.ok) return;
      setStats(await response.json() as Stats);
    } catch { /* keep the previous snapshot */ }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/login", { cache: "no-store" });
        const data = await response.json() as { signedIn?: boolean; defaults?: boolean; email?: string };
        setDefaults(Boolean(data.defaults));
        setSignedIn(Boolean(data.signedIn));
        if (data.email) setEmail(data.email);
      } finally { setChecking(false); }
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void loadStats();
    const timer = window.setInterval(() => { void loadStats(); }, 20_000);
    return () => window.clearInterval(timer);
  }, [signedIn, loadStats]);

  const signIn = async () => {
    setBusy("login"); setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode }),
      });
      if (!response.ok) { setLoginError("Email or passcode is wrong."); return; }
      setSignedIn(true);
      setPasscode("");
      await loadStats();
    } catch { setLoginError("Couldn't reach the server."); }
    finally { setBusy(""); }
  };

  const signOut = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSignedIn(false); setStats(null);
  };

  const createPersonas = async () => {
    setBusy("personas"); setNotice(null);
    try {
      const response = await fetch("/api/admin/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, female, male, nonbinary, ageBand: band }),
      });
      const data = await response.json() as { created?: number; skipped?: number; error?: string };
      if (!response.ok) { setNotice({ kind: "error", text: data.error === "gender_required" ? "Choose at least one gender." : "Could not create personas." }); return; }
      setNotice({ kind: "ok", text: `Created ${data.created ?? 0} personas${data.skipped ? `, skipped ${data.skipped} over the profile cap` : ""}.` });
      await loadStats();
    } catch { setNotice({ kind: "error", text: "Network error." }); }
    finally { setBusy(""); }
  };

  const triggerStory = async () => {
    setBusy("story"); setNotice(null);
    try {
      const response = await fetch("/api/cron/stories?force=1", { method: "POST" });
      const data = await response.json() as {
        ok?: boolean; reason?: string; today?: number; cap?: number; planned?: number; inFlight?: number;
        published?: number; failed?: number;
      };
      if (data.ok) {
        setNotice({ kind: "ok", text: `Render submitted to the GPU. It will appear in the feed when the next tick collects it · ${data.today ?? 0}/${data.cap ?? 80} today.` });
      } else if (data.published) {
        setNotice({ kind: "ok", text: `Collected ${data.published} finished render${data.published === 1 ? "" : "s"} from the GPU.` });
      } else if (data.reason === "in_flight") {
        setNotice({ kind: "ok", text: "A render is already in flight. The next tick will publish it." });
      } else if (data.reason === "not_due") {
        setNotice({ kind: "ok", text: "No slot is due yet — the random plan is deliberately spread out." });
      } else if (data.reason === "gpu_offline" || data.reason === "gpu_loading") {
        setNotice({ kind: "error", text: "The image model is offline or still loading (3–10 min after a kernel boot)." });
      } else if (data.reason === "daily_cap") {
        setNotice({ kind: "error", text: `Daily cap reached (${data.today ?? 80}/${data.cap ?? 80}).` });
      } else if (data.reason === "db_offline") {
        setNotice({ kind: "error", text: "Supabase is not configured in this environment." });
      } else {
        setNotice({ kind: "error", text: `Nothing was posted (${data.reason ?? "unknown"}).` });
      }
      await loadStats();
    } catch { setNotice({ kind: "error", text: "Network error." }); }
    finally { setBusy(""); }
  };

  const runCalls = async () => {
    setBusy("calls");
    try {
      await fetch("/api/cron/calls", { method: "GET" });
      await loadStats();
      setNotice({ kind: "ok", text: "Call rotator swept: due callbacks are ringing, stale rings are missed." });
    } catch { setNotice({ kind: "error", text: "Network error." }); }
    finally { setBusy(""); }
  };

  const mix = useMemo(() => female + male + nonbinary, [female, male, nonbinary]);

  if (checking) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="animate-spin text-[#c60f4d]" /></main>;
  }

  if (!signedIn) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-[380px]">
          <div className="mb-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-[18px] brand-gradient text-white shadow-lg"><Sparkles size={20} /></span>
            <h1 className="mt-3 font-display text-[24px] font-semibold">Cookie Studio</h1>
            <p className="text-[12px] text-[#8a596b]">Internal panel · sign in with your admin email</p>
          </div>
          <Card>
            <label htmlFor="email" className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#a33b5e]">Email</label>
            <input
              id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@cookie.app"
              className="mt-1.5 w-full rounded-[14px] border border-[#f3d7df] bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#f5a3bd]"
            />
            <label htmlFor="passcode" className="mt-3 block text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#a33b5e]">Passcode</label>
            <input
              id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void signIn(); }}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-[14px] border border-[#f3d7df] bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#f5a3bd]"
            />
            {loginError && <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#c60f4d]"><CircleAlert size={12} /> {loginError}</p>}
            <button
              type="button" onClick={() => void signIn()} disabled={busy === "login"}
              className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full brand-gradient px-5 py-3 font-display text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {busy === "login" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Sign in
            </button>
            {defaults && (
              <p className="mt-3 rounded-[12px] bg-[#fff1f5] px-3 py-2 text-[10.5px] leading-snug text-[#8a596b]">
                No admin env vars set — the local defaults are <strong>admin@cookie.app</strong> / <strong>cookie-admin</strong>.
                Set ADMIN_EMAIL, ADMIN_PASSCODE and ADMIN_SECRET before deploying.
              </p>
            )}
          </Card>
          <p className="mt-4 text-center text-[11px] text-[#a97c8b]">Only the email + passcode from the environment can sign in.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1020px] px-4 pb-16 pt-[max(22px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[16px] brand-gradient text-white shadow-[0_14px_26px_-16px_rgba(198,15,77,.9)]"><Sparkles size={18} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-semibold leading-tight">Cookie Studio</h1>
          <p className="truncate text-[11.5px] font-medium text-[#8a596b]">{stats?.email ?? "admin"} · personas, stories, calls</p>
        </div>
        <a href="/" className="press rounded-full border border-white bg-white/80 px-3.5 py-2 text-[11.5px] font-bold text-[#a33b5e]">Open app</a>
        <button type="button" onClick={() => void signOut()} className="press inline-flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3.5 py-2 text-[11.5px] font-bold text-[#8a4258]">
          <LogOut size={13} /> Sign out
        </button>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users size={12} />} label="AI personas" value={stats ? `${stats.personas.ai}` : "—"} hint={stats ? `${stats.personas.remaining} slots left of ${stats.personas.cap}` : "loading"} />
        <Stat icon={<Image size={12} />} label="Stories today" value={stats ? `${stats.stories.today}/${stats.stories.cap}` : "—"} hint="random times, hard daily cap" />
        <Stat icon={<Clock3 size={12} />} label="Next story" value={stats ? (stats.stories.inFlight ? "rendering" : !stats.stories.nextAt ? "not planned" : stats.stories.nextAt <= Date.now() ? "due now" : `${Math.ceil((stats.stories.nextAt - Date.now()) / 60_000)} min`) : "—"} hint={`${stats?.stories.planned ?? 0} random slots left today`} />
        <Stat icon={<PhoneCall size={12} />} label="Live calls" value={stats ? `${stats.calls.used}/${stats.calls.capacity}` : "—"} hint="14 usable of 16 fixed slots" />
      </div>

      {!stats?.db && (
        <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-[#ffd3a8] bg-[#fff7ec] px-3.5 py-3 text-[11.5px] font-medium text-[#8a5a12]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <span>Supabase is not configured. Personas and stories will fall back to demo data. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run <code className="rounded bg-white/70 px-1">supabase/schema.sql</code>.</span>
        </div>
      )}

      {notice && (
        <div className={`mt-4 flex items-start gap-2 rounded-[16px] px-3.5 py-3 text-[11.5px] font-semibold ${notice.kind === "ok" ? "border border-[#bfe9d4] bg-[#effaf4] text-[#1c7a52]" : "border border-[#ffd2da] bg-[#fff1f4] text-[#a3143f]"}`}>
          {notice.kind === "ok" ? <Check size={14} className="mt-0.5 shrink-0" /> : <X size={14} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#ffe4ee] text-[#c60f4d]"><Plus size={16} /></span>
            <div>
              <h2 className="font-display text-[16px] font-semibold leading-tight">Create AI personas</h2>
              <p className="text-[10.5px] font-medium text-[#8a596b]">Rows, not accounts — instant, no email needed.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <label className="col-span-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#a33b5e]">
              How many
              <input type="number" min={1} max={60} value={count} onChange={(event) => setCount(Math.min(60, Math.max(1, Number(event.target.value) || 1)))}
                className="mt-1 w-full rounded-[12px] border border-[#f3d7df] bg-white px-3 py-2 text-[13px] font-semibold text-[#34101d] outline-none focus:border-[#f5a3bd]" />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a33b5e]">
              Women
              <input type="number" min={0} max={60} value={female} onChange={(event) => setFemale(Math.max(0, Number(event.target.value) || 0))}
                className="mt-1 w-full rounded-[12px] border border-[#f3d7df] bg-white px-3 py-2 text-[13px] font-semibold text-[#34101d] outline-none focus:border-[#f5a3bd]" />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a33b5e]">
              Men
              <input type="number" min={0} max={60} value={male} onChange={(event) => setMale(Math.max(0, Number(event.target.value) || 0))}
                className="mt-1 w-full rounded-[12px] border border-[#f3d7df] bg-white px-3 py-2 text-[13px] font-semibold text-[#34101d] outline-none focus:border-[#f5a3bd]" />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a33b5e]">
              Non-binary
              <input type="number" min={0} max={60} value={nonbinary} onChange={(event) => setNonbinary(Math.max(0, Number(event.target.value) || 0))}
                className="mt-1 w-full rounded-[12px] border border-[#f3d7df] bg-white px-3 py-2 text-[13px] font-semibold text-[#34101d] outline-none focus:border-[#f5a3bd]" />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a33b5e]">
              Age band
              <select value={band} onChange={(event) => setBand(event.target.value as typeof band)}
                className="mt-1 w-full rounded-[12px] border border-[#f3d7df] bg-white px-2.5 py-2 text-[13px] font-semibold text-[#34101d] outline-none focus:border-[#f5a3bd]">
                {BANDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
              </select>
            </label>
            <div className="flex flex-col justify-end text-[10px] font-semibold text-[#a97c8b]">
              <span className="rounded-[10px] bg-[#fff1f5] px-2 py-1.5 text-center">{mix === 0 ? "pick a mix" : `${count} total · mix ${mix}`}</span>
            </div>
          </div>

          <p className="mt-2.5 text-[10.5px] leading-snug text-[#8a596b]">
            The gender split repeats to fill the batch. Creation stops at the database profile cap
            ({stats?.personas.cap ?? 400}); {stats?.personas.remaining ?? "—"} slots remain.
          </p>

          <button type="button" onClick={() => void createPersonas()} disabled={busy === "personas" || mix === 0}
            className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full brand-gradient px-5 py-2.5 font-display text-[13.5px] font-semibold text-white disabled:opacity-55">
            {busy === "personas" ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {busy === "personas" ? "Creating…" : "Create personas"}
          </button>
        </Card>

        <div className="grid gap-4">
          <Card>
            <h2 className="font-display text-[16px] font-semibold">Story factory</h2>
            <p className="mt-1 text-[11px] leading-snug text-[#8a596b]">
              Every morning a random, human-looking set of post times is planned. When one comes due, the LLM adapts a
              base scene in the persona&apos;s voice, the GPU renders it at 9:16 with the persona as a reference, and the
              finished bytes are copied into the temporary bucket. The daily budget is claimed atomically — retries
              can&apos;t overshoot {stats?.stories.cap ?? 80}.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-[14px] bg-[#fff1f5] px-3 py-2.5">
              <span className="text-[11px] font-semibold text-[#8a4258]">Last post</span>
              <span className="text-[11px] font-bold text-[#34101d]">
                {stats?.stories.lastAt ? `${Math.max(0, Math.round((Date.now() - stats.stories.lastAt) / 60_000))} min ago` : "never"}
              </span>
            </div>
            <button type="button" onClick={() => void triggerStory()} disabled={busy === "story"}
              className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f3c7d5] bg-white px-4 py-2.5 font-display text-[13px] font-semibold text-[#c60f4d] disabled:opacity-55">
              {busy === "story" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {busy === "story" ? "Rendering…" : "Post a story now"}
            </button>
            <p className="mt-2 text-[10px] text-[#a97c8b]">Forcing pulls the next planned slot forward, never past the daily cap.</p>
          </Card>

          <Card>
            <h2 className="font-display text-[16px] font-semibold">Call rotator</h2>
            <p className="mt-1 text-[11px] leading-snug text-[#8a596b]">
              {stats?.calls.used ?? 0} of {stats?.calls.capacity ?? 14} usable slots are leased. Busy callers get an
              in-character note and a scheduled callback; unanswered rings become missed calls.
            </p>
            <button type="button" onClick={() => void runCalls()} disabled={busy === "calls"}
              className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f3c7d5] bg-white px-4 py-2.5 font-display text-[13px] font-semibold text-[#c60f4d] disabled:opacity-55">
              {busy === "calls" ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
              Sweep callbacks now
            </button>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <h2 className="font-display text-[16px] font-semibold">How the automation runs</h2>
        <div className="mt-2 grid gap-2 text-[11px] leading-relaxed text-[#5c2a3b] sm:grid-cols-2">
          <p><strong>Scheduler:</strong> Supabase <code className="rounded bg-[#fff1f5] px-1">pg_cron</code> calls <code className="rounded bg-[#fff1f5] px-1">/api/cron/stories</code> every two minutes and <code className="rounded bg-[#fff1f5] px-1">/api/cron/calls</code> every minute through <code className="rounded bg-[#fff1f5] px-1">pg_net</code>. No GitHub runners.</p>
          <p><strong>Two-phase render:</strong> one tick submits a job and returns; later ticks poll the GPU and publish. No request ever waits ~400 s, so free-tier function limits are irrelevant.</p>
          <p><strong>Cleanup:</strong> hourly, expired stories and their stored images are deleted; schedule and job rows older than three days are pruned. Vercel&apos;s daily cron is only a backstop.</p>
          <p><strong>Cost:</strong> the GPU render is the only heavy job. Feed reads are CDN-cached, and images are proxied through Vercel&apos;s edge so Supabase egress stays flat.</p>
        </div>
      </Card>
    </main>
  );
}
