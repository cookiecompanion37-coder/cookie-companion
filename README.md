# Cookie — AI Companion

A mobile-first AI companion app with a soft pink identity: discover or create a companion,
chat with reactions and selfies, hop on a voice call, and share 24-hour stories. Next.js
App Router, strict TypeScript, Tailwind CSS v4, Framer Motion, Lucide.

The phone-shaped shell is 430 px on desktop and full-bleed on phones. All user data
(session, chats, memories, credits, calls, wallpapers, settings) persists in `localStorage`
under `cookie:v1`; generated photos persist to Supabase when configured, otherwise as
compressed data URLs.

## Run

```bash
npm install
cp .env.example .env.local   # fill what you need — everything degrades gracefully
npm run dev                  # http://localhost:3000
npm run typecheck
npm run build
```

Without Supabase the app runs in **demo mode**: the story rail is filled from the seeded
cast, likes stay on-device, and the admin panel shows an offline warning. Nothing crashes.

Next 16 writes `AGENTS.md` automatically; leave that block alone.

## What is in here

| Area | What it does |
| --- | --- |
| **Stories** | Home rail + full Stories board + full-screen 9:16 viewer. Real 24 h countdown, visible like counts, optimistic likes, in-browser photo upload. AI companions post alongside people. |
| **AI story factory** | Random human-looking time plan (≤ `AI_STORIES_PER_DAY`, default 80/day), base-scene catalogue, LLM caption in the persona's voice, GPU render with the persona as an img2img reference, copied into a temporary Supabase bucket. |
| **Admin panel** | `/admin` — email + passcode sign-in, batch persona creation (count + gender split + age band) with a database profile cap, story budget visibility, manual render tick, call-slot sweep. |
| **Call rotator** | 16 physical slots, 14 usable. Full pool → in-character "I'm busy" message written by the LLM plus a scheduled callback. Unanswered rings become missed calls. |
| **Everything else** | Companion chat, selfies, voice notes, live GPU calls, discovery, creation, memory, credits, safety. |

## Environment

Server-only (never use a `NEXT_PUBLIC_` prefix):

| Variable | Purpose |
| --- | --- |
| `ZERO_BASE_URL`, `ZERO_API_KEY`, `ZERO_MODEL` | OpenAI-compatible chat router used by `/api/chat`. Without it the client gets a friendly degraded reply. |
| `VMODEL_API_TOKEN`, `VMODEL_BASE_URL`, `VMODEL_VERSION` | VModel text-to-image for character portraits and in-chat photos. Optional; the story pipeline uses the GPU node instead. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_STORY_BUCKET` | Persistence, storage, stories, calls. Optional. |
| `GPU_NODE_SUPABASE_URL`, `GPU_NODE_SUPABASE_ANON_KEY` | Optional override for GPU node discovery (`lib/server/gpu.ts`). Defaults are baked in. |
| `AI_STORIES_PER_DAY`, `AI_STORY_DAILY_TARGET` | Hard daily cap (80) and the density used by the random planner. |
| `MAX_AI_PROFILES` | Persona factory hard stop (400). |
| `ADMIN_EMAIL`, `ADMIN_PASSCODE`, `ADMIN_SECRET` | Admin sign-in + HMAC cookie secret. **Change before deploying.** |
| `CRON_SECRET` | Bearer token accepted by `/api/cron/*` (pg_cron / Vercel cron). |
| `SITE_URL` | Fallback origin used to fetch persona portraits for img2img. On Vercel the request origin is used. |

## Supabase setup (once)

1. Create a project (free tier is fine).
2. SQL editor → run `supabase/schema.sql` (tables, RPCs, indexes, RLS, buckets).
3. SQL editor → run `supabase/cron.sql`. It enables `pg_cron` + `pg_net`, creates two
   Vault secrets, and schedules the story tick (2 min), call tick (1 min) and cleanup
   (hourly).
4. Put your deployment URL and the same `CRON_SECRET` into the two Vault secrets
   (the file contains the exact `vault.update_secret` statements).
5. Add the env vars above to Vercel.

There is **no GitHub Actions workflow**. Scheduling lives in Supabase; Vercel's daily cron
is only a cleanup backstop. See [`docs/SCALING.md`](./docs/SCALING.md) for the full design,
the two-phase renderer, and the free-tier maths for ~10 000 daily users.

## Admin panel

Open `/admin`.

```
email:    ADMIN_EMAIL      (default admin@cookie.app)
passcode: ADMIN_PASSCODE   (default cookie-admin)
```

The defaults exist so a fresh clone works; the panel warns loudly while they are active and
the cookie is signed with `ADMIN_SECRET`. Creating 20 personas is one batched insert — no
auth accounts, no emails. The batch stops at `MAX_AI_PROFILES` and the UI shows how many
slots remain.

## Map

```
app/
  page.tsx              → <AppShell />
  admin/                → Cookie Studio (standalone, no app shell)
  api/chat              → the only chat model call (hardened)
  api/stories           → feed (CDN-cached) + create; opportunistic render tick
  api/stories/like      → one atomic toggle RPC
  api/stories/media/[id]→ CDN-cached image proxy (keeps Supabase egress flat)
  api/calls/{slot,busy,schedule}
  api/cron/{stories,calls,cleanup}
  api/admin/{login,personas,stats}
  api/image/{generate,status,file}
  api/storage/upload
  api/characters        → shared characters (Supabase)
  api/gpu/{call,voice,image,tts}
components/
  layout/               → AppShell, ShellContent, TabBar, ScreenStack
  stories/              → StoryHost, StoryRail, StoryViewer, StoryComposer
  ui/                   → Avatar, Button/Chip, Sheet, Toast, WallpaperBg, CreditRing, Cookie
  chat/                 → Bubble, Composer, ReactionTray, TypingChips, Waveform
  call/                 → IncomingCall, ActiveCall, CallSummarySheet
  effects/              → CookieLoader, Particles (FxHost + fx.*)
  profile/              → WallpaperPicker
lib/
  engine/               → EngineProvider (chat/call state machine), api, timing, types
  server/               → stories, storyPlan, personas, calls, admin, gpu, db, supabase,
                          prompt, sanitize, vmodel, llm, safety, rateLimit
  storyFeed.ts          → client story store (feed, likes, expiry)
  callsClient.ts        → browser side of the call rotator
  device.ts             → anonymous per-device id
  store.ts nav.tsx      → localStorage state + tiny router/sheet router
  theme.ts constants.ts credits.ts seed.ts types.ts
screens/                → Welcome, SignIn, Onboarding, Home, Discover, Call, Me, Chat,
                          Create, Stories
sheets/                 → Character, Wallpaper, Memory, Paywall, SmallSheets, SheetHost
supabase/               → schema.sql, cron.sql
docs/SCALING.md         → free-tier design + setup + maths
```

## Product rules

- **UI never calls an image model directly.** The chat model decides to send a photo
  (`image` field in its JSON). The engine shows a placeholder, calls `/api/image/generate`
  with up to three character references, compresses, uploads, and swaps in the result.
- **Image prompts look like normal phone photos** (selfies, mirror selfies, candid moments),
  are short, and are sanitized server-side.
- **Stories expire.** Images are proxied through Vercel's cache and deleted from storage
  hourly once expired; the feed and the UI both respect `expires_at`.
- **Calls are a model choice too.** A chat reply can set `"call":"ring"`; a full call pool
  produces a written excuse and a scheduled callback instead.
- **Characters are consistent.** Creation keeps a main portrait plus 2–3 extra shots
  (`gallery`), all passed back as references. AI stories reuse the portrait as an img2img
  reference.
- **Memory is visible and editable** in the character sheet and Memory sheet; capped at 12
  facts per character and injected into every prompt.
- **Safety is enforced server-side** (`lib/server/safety.ts`, `sanitize.ts`, prompt rules):
  18+, crisis resources, minor refusal, 25-word call turns, no markdown in voice.

See [`architecture.md`](./architecture.md) for request shapes and
[`docs/SCALING.md`](./docs/SCALING.md) for the scheduler and capacity plan.
