# Cookie — Handoff Guide

Cozy AI companion app (18+). Next.js 16 App Router, mobile-first "app shell" UI, Supabase for auth + Postgres.
Working branch: `v0/fix-call-isolation-and-config`.

## What is COMPLETED

### UI / Theme
- Full screen set in `screens/`: Welcome, SignIn, Discover, Chat, Stories, Me — wired through `components/layout/AppShell.tsx` + `ShellContent.tsx`.
- **Dark mode is done**: `wall-midnight` palette in `app/globals.css` (deep plum gradient, dark surfaces, light ink). Toggle lives in `screens/MeScreen.tsx` ("Dark mode" switch) — it flips `state.wallpaper` between `midnight` and `sakura` via `lib/store.ts`. Wallpaper definitions incl. `midnight` are in `lib/theme.ts`.
- **New cookie logo is in**: `public/brand/logo.png` (also copied to `public/cookie-icon.png`, `public/cookie-logo.png`, `public/cookie-icon-192.png`). Used in the Welcome header. Swap the favicon/manifest icons to these files if desired.
- Design tokens/util classes (`card`, `glass`, `tab-glass`, `bubble-ai`, `bubble-me`, `candy-text`, etc.) live in `app/globals.css`; dark overrides are at the bottom of that file under the `wall-midnight` block.

### Backend (code exists and is wired)
- **Auth**: `app/api/auth/route.ts` — signup / signin / signout via Supabase Auth. Error messages now surface the real Supabase reason (invalid email, already exists, weak password, rate limit) instead of a generic "check your details".
- **Chat (Zero LLM)**: `lib/server/llm.ts` + `lib/server/vmodel.ts` — chat replies via `ZERO_*` env vars, chat images + profile images via `VMODEL_API_TOKEN`. Routes: `app/api/gpu/call/route.ts`, `app/api/image/generate/route.ts`.
- **Stories (GPU node)**: `lib/server/gpu.ts` + `lib/server/stories.ts` (story prompt engine, ~680 lines) — story generation runs through the GPU node using `GPU_NODE_SUPABASE_URL` / `GPU_NODE_SUPABASE_ANON_KEY`. Cron entry: `app/api/cron/stories/route.ts` (auth via `CRON_SECRET`).
- **Discovery**: `screens/DiscoverScreen.tsx` + `components/ui/CompanionCard.tsx` — real profiles and bot profiles both render from Supabase data.
- Supabase client: `lib/supabase/server.ts` (server-side). Env vars present: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

## What is REMAINING

1. **AI provider keys are not in the project env.** The code expects `ZERO_API_KEY`, `ZERO_BASE_URL`, `ZERO_MODEL`, `VMODEL_API_TOKEN`, `GPU_NODE_SUPABASE_URL`, `GPU_NODE_SUPABASE_ANON_KEY`, `CRON_SECRET`. User states these live in their Supabase env file — copy them into the Vercel project env vars (Settings → Vars) or `/vercel/share/.env.project`. Until then all AI features fail at the "missing key" guard.
2. **Signup requires a real email domain.** Supabase rejects `example.com`-style addresses (`email_address_invalid`). Also **email confirmation is ON** (`mailer_autoconfirm: false`), so signup returns no session — user must click the confirm link before signing in. Either wire the confirmation flow in the UI or turn confirmation off in the Supabase dashboard for testing.
3. **Story cron scheduling**: the route exists but needs a Vercel Cron entry (in `vercel.json`) hitting `/api/cron/stories` with the `CRON_SECRET` header.
4. **Profile images via vmodel**: verify `app/api/image/generate/route.ts` end-to-end once `VMODEL_API_TOKEN` is set (avatar generation for real + bot profiles).
5. **Favicon / PWA icons**: still point at old assets — update `app/layout.tsx` metadata icons to `/brand/logo.png`.
6. **Cleanup**: remove the `console.log("[v0] auth error", ...)` debug line in `app/api/auth/route.ts` once auth is confirmed working.

## Quick verification checklist
- `pnpm exec tsc --noEmit` — passes as of last commit.
- Dark mode: Me → toggle "Dark mode" → chat/discover surfaces go dark.
- Signup test: use a real domain (gmail) — confirmed working against Supabase directly.
