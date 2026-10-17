# Scaling Cookie on the free tiers

The social side (stories, likes, AI story factory, call rotator) is designed to run on
**Supabase Free + Vercel Hobby**, without GitHub Actions or any paid scheduler. This
document explains the moving parts, the numbers behind them, and exactly what to do to
enable it.

```
                 ┌───────────────────────────── Supabase ─────────────────────────────┐
                 │  Postgres: stories, likes, plan, jobs, call slots, callbacks         │
                 │  pg_cron ── every 2 min ──▶ pg_net ──▶ POST /api/cron/stories        │
                 │           ── every 1 min ──▶ pg_net ──▶ POST /api/cron/calls          │
                 │           ── hourly ───────▶ pg_net ──▶ POST /api/cron/cleanup        │
                 │  Storage: cookie-stories (24 h retention)                            │
                 └──────────────────────────────────────────────────────────────────────┘
                                              │
                         ┌────────────────────▼─────────────────────┐
                         │  Vercel (Fluid, Node runtime, Hobby)     │
                         │  /api/stories      CDN-cached feed        │
                         │  /api/stories/media/[id]  CDN-cached image│
                         │  /api/cron/*       two-phase renderer     │
                         │  /admin            internal panel         │
                         └────────────────────┬─────────────────────┘
                                              │ resolve node URL from active_nodes
                         ┌────────────────────▼─────────────────────┐
                         │  GPU node (Cloudflare tunnel)            │
                         │  /v1/image-generate  ~400 s per render   │
                         └──────────────────────────────────────────┘
```

## Why the story factory is two-phase

The image GPU takes roughly **400 seconds** per render, while Vercel Hobby caps a function
at **300 seconds**. Waiting inside one request would fail. Instead:

1. **Submit tick** — when a planned slot is due, one small request picks a persona and
   scene, asks the LLM for a caption, submits the job to the GPU with the persona portrait
   as an img2img reference, stores a `story_jobs` row, and returns in a few seconds.
2. **Collect tick** — later invocations poll the job. When the GPU says `done`, the bytes
   are downloaded **immediately** (the GPU keeps images in memory for ~20 minutes), copied
   into `cookie-stories`, and the story row is inserted. The GPU URL is never shown to users.

Each phase is short, idempotent, and safe to run on a free function. A tick is also fired
opportunistically by `/api/stories` (at most once every 2 minutes per instance) so the feed
keeps moving even before pg_cron is configured.

## Random, human-looking timing (not a metronome)

`lib/server/storyPlan.ts` builds **the day's schedule once**, then the dispatcher just obeys it:

- weighted hours for the audience day (IST): quiet 2–6 am, breakfast burst, afternoon lull,
  peak 7–11 pm;
- a random minute inside each chosen hour, with a **7-minute minimum gap** (renders never
  overlap);
- the count is capped by `AI_STORIES_PER_DAY` (default **80**);
- deploying mid-day only plans the **remaining** hours, so it never crams 80 posts into an
  evening;
- a brand-new deployment gets one "kickstart" post within a few minutes so the rail is not empty;
- if the GPU is loading, the slot is retried for up to 25 minutes, then retired.

Rows live in `story_plan`; `claim_story_slot()` hands them out atomically with
`FOR UPDATE SKIP LOCKED`. Nothing can post twice or exceed the budget.

## Free-tier maths for ~10 000 daily users

Assumptions: 24 story cards per feed page (~7 KB JSON), a story image ~65 KB
(1024 px long edge, JPEG), each daily viewer opens ~4 stories, browser caches images for 24 h.

| Item | Per day | Per month | Free limit | Headroom |
| --- | --- | --- | --- | --- |
| Feed requests | 100 000 | 3 M | — | CDN absorbs ~95 % (`s-maxage=20`, SWR 120) |
| Origin feed requests | ~5 000 | 150 k | Function invocations | fine |
| CDN feed bytes | 700 MB | 21 GB | Vercel 100 GB transfer | 4.7× |
| CDN image bytes (4 views/user) | 2.6 GB | 78 GB | Vercel 100 GB transfer | 1.3× |
| Supabase image origin reads | ~0.1 GB | ~3 GB | Supabase 5 GB egress | 1.6× |
| DB rows | ~300 posts/day, 24 h retention | — | 500 MB | >5 years |
| Storage | ~300 × 65 KB ≈ 20 MB steady | — | 1 GB | 50× |
| Likes | ~20 k RPCs/day | 600 k | — | trivial |
| Cron invocations | ~1 080/day | 32 k | Vercel Hobby | fine |

The big lever is the **media proxy** (`/api/stories/media/[id]`): images are fetched from
Supabase once per Vercel edge region and then served from Vercel's cache for 24 h. Without
it, ten thousand viewers would pull every image from Supabase and blow the 5 GB egress
allowance in days.

> Honest limits: Vercel Hobby includes 100 GB of transfer. 10 000 daily viewers × 4 story
> views fits. If traffic doubles, the two options are Vercel Pro (1 TB) or reducing
> `side` in `lib/server/stories.ts` to 896 px. Supabase itself stays free either way.

## Supabase rules the code follows

| Rule | Where |
| --- | --- |
| No images in Postgres — storage paths only | `stories.media_url`, `stories.media_path` |
| Only select the columns the UI renders | `lib/server/stories.ts`, `lib/server/db.ts` |
| Cursor pagination, never offsets | `/api/stories?before=<epoch-ms>&limit=24` |
| Denormalised like counts, one RPC per tap | `toggle_story_like` |
| Atomic counters, no read-modify-write races | `claim_daily_budget`, `claim_story_slot`, `claim_call_slot` |
| Counts use `HEAD` + `Prefer: count=exact` (0 rows transferred) | `dbCount()` |
| One cleanup pass instead of per-read expiry work | `take_expired_stories()` + `/api/cron/cleanup` |
| Writes only from server routes (service role) | every `app/api/*` write |
| Compressed uploads + immutable cache headers | `lib/server/supabase.ts` |
| Persona list cached for 5 minutes per instance | `personaPool()` in `lib/server/stories.ts` |

## Vercel rules

- **Fluid compute, Node runtime.** No `runtime = "edge"` (removed in Next 16.3). All routes
  are I/O-bound, so Active CPU stays near zero.
- **Everything public is CDN-cached.** The story feed is `public, s-maxage=20,
  stale-while-revalidate=120`; images are `public, s-maxage=86400, immutable`.
- **No polling storms.** The client refreshes the feed every 90 s, and that request is
  almost always served from the edge. Callback polling (45 s) is skipped when the tab is
  hidden or a call is active.
- **Heavy work is cron-only** and split into short ticks. `maxDuration` is explicit on the
  render routes (60 s), cleanup (60 s).
- **Vercel cron is only a backstop** for cleanup once a day. Hobby does not allow
  minute-level Vercel cron; Supabase pg_cron does the frequent work.

## Enabling the scheduler (one time)

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run `supabase/cron.sql` in the same editor. It enables `pg_cron` and `pg_net`, creates
   two Vault secrets, and schedules three jobs.
3. Edit the two Vault secrets (SQL editor, as `postgres`):

   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'cookie_site_url'),
     'https://your-app.vercel.app'
   );
   select vault.update_secret(
     (select id from vault.secrets where name = 'cookie_cron_secret'),
     'the-same-value-as-CRON_SECRET'
   );
   ```

4. Add the same `CRON_SECRET` (and `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_*`) to Vercel.
5. If Deployment Protection is on, allow the pg_net requests (or disable protection for
   `/api/cron/*`); otherwise they get a 401 from Vercel before reaching the route.

Check health:

```sql
select jobname, schedule, active from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;
```

## Call rotator

- 16 physical slots, **14 usable** (2 spare for headroom).
- Claims are atomic (`FOR UPDATE SKIP LOCKED`); a session re-claim keeps its slot. The lease
  is 120 s and the client heartbeats every 30 s while a call is live.
- When the pool is full, the LLM writes a deliberately vague in-character excuse
  ("this evening", "in a bit") and the server schedules a random 2–8 minute callback
  without ever quoting that window to the user. That becomes a `call_schedules` row.
- `/api/cron/calls` flips due rows to `ringing`; the app polls `/api/calls/schedule` and
  raises the incoming-call screen. Unanswered rings become `missed`.
- Everything degrades to an in-memory rotator when Supabase is not configured.

## Image generation contract

`lib/server/gpu.ts` already resolves the live tunnel URL from Supabase
(`active_nodes?id=eq.0&select=node_url`), caches it for 60 s, and wraps the open routes:

| Step | Route |
| --- | --- |
| model ready? | `GET /v1/image-generate` → `{ ready, model }` |
| submit | `POST /v1/image-generate` (JSON, or multipart with `image` reference) |
| poll | `GET /v1/image-generate/{job_id}` → `queued / running / done / failed` |
| download | `GET {result.image_url}` (same tunnel only; rejected otherwise) |
| cancel | `DELETE /v1/image-generate/{job_id}` |

No API key is used. Failures (`501 image_gen_off`, `502 image_server_down`, tunnel down)
are treated as "try again later"; they never consume the daily budget (a failed submit
releases the budget unit).

## Growth checklist

- **More stories**: raise `AI_STORIES_PER_DAY`. The planner keeps the min gap, so the day
  simply gets denser; the GPU is the real ceiling (~1 render / 7 min → ~200/day).
- **More viewers**: keep images at 1024 px, then move to Vercel Pro / paid bandwidth.
- **More writes**: likes are one RPC; add a per-viewer rate limit in
  `/api/stories/like` if abuse appears.
- **More personas**: `MAX_AI_PROFILES` guards the admin factory; rows are cheap.
- **Cleanup**: hourly `take_expired_stories(300)` keeps storage flat. If a burst exceeds
  that, the next run catches up.
