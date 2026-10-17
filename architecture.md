# Cookie — architecture

## Runtime layers

```
screens/ ──use──▶ lib/engine/EngineProvider ──fetch──▶ app/api/* ──▶ provider APIs
   │                 │  (chat, calls, photos)             │
   │                 │                                  lib/server/* (prompt, sanitize,
   │                 │                                   vmodel, supabase, gpu, stories,
   │                 │                                   personas, calls, db)
   ├── stories/ ──▶ lib/storyFeed.ts ──fetch──▶ /api/stories ──▶ CDN cache
   └── admin (standalone page, no app shell)

Supabase pg_cron ──pg_net──▶ /api/cron/{stories,calls,cleanup}
lib/store.ts + lib/nav.tsx keep state and routing
```

- **Client state** lives in `lib/store.ts` (`getState`, `setState`, `useAppState`, `useHydrated`). It is a tiny external store synced to `localStorage["cookie:v1"]` and merged with `DEFAULT_STATE` on load, so new fields need no migration — add them to `AppState` and to `DEFAULT_STATE`.
- **Routing** is `lib/nav.tsx`: four tabs (`chats`, `discover`, `calls`, `me`), a stack for `chat`/`create`/`stories`, and one modal sheet at a time. Story-viewer and composer overlays live in `components/stories/StoryHost.tsx` so both the Home rail and the Stories board can open them. `sheets/SheetHost.tsx` is the single switch for every sheet name.
- **The engine** (`lib/engine/EngineProvider.tsx`) owns all asynchronous conversation behaviour: request batching, typing timers, delivered/seen ticks, per-character busy state, image planning, voice-note STT, call ringing, and the live call state machine (`useCallControls`, `useCallSession`).

## Local data model (`lib/types.ts`)

```ts
AppState {
  stage: "welcome" | "signin" | "onboarding" | "main"
  session: { name; email; vibe; interests } | null
  ageConfirmed: boolean
  plan: "free" | "plus" | "max"
  credits: { dayKey; textsUsed; callSecondsToday; bonusCallSeconds; planCallSecondsUsed; packCallSeconds }
  chats: Record<string, Chat>            // Chat = { messages, unread, pinned, sent, lastTs }
  customCharacters: Character[]          // made by you
  sharedCharacters: Character[]          // fetched from /api/characters
  memory: Record<characterId, string[]>  // max 12 per character
  calls: CallLog[]                       // { id, characterId, direction, startedAt, durationSec, outcome }
  settings: { haptics, sounds, captions, reduceMotion }
  wallpaper: WallpaperId
  characterWallpapers: Record<characterId, WallpaperId>
}
```

`Msg` carries `{ id, role, kind, text, ts, reactions, status, image?, durationSec? }`. `image.status` moves `pending → ready | failed`, which is what the chat bubble renders.

## Server contracts

### `POST /api/chat`
Input is `ChatRequest` (character brief, userName, message history ≤ 20, memory, call state, event, mode). The route:
1. Size/rate/safety prechecks (`precheck`).
2. Builds a strict JSON prompt (`buildSystemPrompt`) with an untrusted context blob.
3. Calls the Zero router (`callLLM`), recovers JSON (`recoverJson`).
4. Sanitizes through `sanitize(raw, req)` → `ChatResponse`.
5. Returns `200` with `degraded: true` and a canned in-character line when the provider is unavailable.

`ChatResponse` is always complete: `bubbles[]`, `reaction`, `call` (`none|busy|ring`), `callbackInSec`, `memory[]`, `quickReplies[]`, `safety` (`ok|crisis|minor`), `mood`, `image{prompt,ar}|null`.

### Photo pipeline
`POST /api/image/generate` `{ scene, appearance, ar, references[] }` → server builds a short, sanitized prompt (`buildPhotoPrompt`), sends `model_variant: "flare"`, `resolution: "1k"`, up to 3 `img_urls`, and returns `{ taskId, ar }`.
`GET /api/image/status?id=` polls VModel (`starting|processing|succeeded|failed|canceled`) and returns `{ status, url }` where `url` is the `/api/image/file?u=…` proxy (VModel files expire after ~1 hour).
The engine then compresses with `compressFromUrl(url, 760, 0.84)` and posts to `/api/storage/upload` (Supabase when configured) before patching the bubble.

### Characters
`GET /api/characters` → `{ characters, shared }` (Supabase table or empty).
`POST /api/characters` → validates and upserts a public character (name/personality required; photos already hosted).
Discover merges your own, shared, and the ten seeded companions.

### Voice and calls
- `POST /api/gpu/voice` → STT + TTS for voice notes.
- `POST /api/gpu/image` → multimodal image description (photo attachment in chat).
- `POST /api/gpu/call` → `{ sessionId, ws }`. The system prompt is built **server-side** from the character and the user's name (`buildCallPrompt`), so the client never ships persona text to the GPU.
- Live audio protocol: client sends `{ type: "text" | "audio", … }` frames over the returned WS; server emits `cc:callPhase` / `cc:callAi` style events through `useCallSession` (see that file for the exact message shapes). If the WS never arrives the call stays on the typed fallback and the UI explains it.

### Stories

`GET /api/stories?limit=&before=` → `{ stories, source }`, cached at the edge
(`s-maxage=20`, SWR 120). Rows come from `stories`, only the columns the UI renders.
`POST /api/stories` validates and inserts a human story (rate-limited per device).
`POST /api/stories/like` → `toggle_story_like(p_story, p_viewer)` in one round trip; the
response carries the fresh count.
`GET /api/stories/media/[id]` → proxy with `s-maxage=86400, immutable`. The browser only
ever sees same-origin URLs; Supabase storage is read once per edge region per object.

Client state is `lib/storyFeed.ts`: one shared fetch for rail/board/viewer, optimistic
likes persisted in `localStorage["cookie:story-likes"]`, and a 60 s expiry sweep. A story
DTO is `{ id, authorId, authorName, authorEmoji, authorAccent, mediaUrl, caption, scene,
isAi, likeCount, createdAt, expiresAt, mine? }`.

### AI story factory

```
ensureDayPlan() ──▶ story_plan rows (random times, ≤ 80/day)
tick (pg_cron, 2 min)
  ├─ pollJobs(): poll GPU ≤ 2 jobs → done? download bytes → storage → stories row
  └─ no job in flight + slot due? → pick persona/scene → LLM caption → GPU submit
                                     → story_jobs row (returns immediately)
```

- `lib/server/storyPlan.ts` is pure: weighted IST hours, 7-minute minimum gap, proportional
  mid-day planning, kickstart slot for a brand-new deployment.
- `claim_story_slot()` / `release_story_slot()` / `finish_story_slot()` make hand-off atomic;
  a claim older than 30 minutes is retired.
- The daily budget is `claim_daily_budget('ai_stories', day, AI_STORIES_PER_DAY)`; a failed
  submit calls `release_daily_budget` so retries don't eat the cap.
- The GPU job contract is in `lib/server/gpu.ts`: node URL from `active_nodes`, submit with
  an optional reference image, poll, download from the same tunnel only, cancel on failure.
  Results live in GPU memory for ~20 minutes, so collection happens promptly.
- A feed request nudges the same tick at most once per 2 minutes (`after()`), making the
  pipeline work even before pg_cron is configured.

### Admin

`/admin` is a standalone client page (no app shell). `POST /api/admin/login` checks
`ADMIN_EMAIL`/`ADMIN_PASSCODE` and sets an HMAC-signed HttpOnly cookie (12 h, signed with
`ADMIN_SECRET`). `GET /api/admin/stats` returns persona counts, story plan/job state and
call-slot usage. `POST /api/admin/personas` creates rows in one batch, respecting
`MAX_AI_PROFILES`. `POST /api/cron/stories?force=1` pulls the next slot forward.

### Call rotator

`POST /api/calls/slot` claims a lease (1–14), heartbeats extend it, release frees it;
`lib/callsClient.ts` owns the browser side. `POST /api/calls/busy` gets the in-character
excuse + delay; `POST /api/calls/schedule` stores the callback and resolves it
(`connected|missed|cancelled`). `GET /api/calls/schedule?user=` returns due rings and recent
history; the engine polls it every 45 s while the tab is visible.

## Screen → sheet map

| Screen | Opens |
| --- | --- |
| Discover | `character{id}` |
| Home chat row call | `character` via chat + `requestCall` |
| Chat header | `character`, `wallpaper{id}`, `memory{id}`, `report{id}` |
| Chat composer | `paywall` when credits are exhausted |
| Calls | `character` via call-back |
| Me | `editProfile`, `paywall`, `memory`, `safety`, `report`, `deleteData` |
| Create | `paywall` at the plan's character cap |
| Engine | `safety` (crisis), `minorGate`, `outOfMinutes`, `callSummary{logId}` |

## Visual system

- Palette from the logo: background `#FCD2E0`, candy `#F5286E`, cookie `#FEC077`, ink `#2B0D16`.
- Tailwind v4 theme tokens live in `app/globals.css` (`--color-candy`, `--color-choco`, `--color-cream`, …). Utility classes used across the app: `.app-shell`, `.wscreen`, `.wall-*`, `.card`, `.glass`, `.brand-gradient`, `.bubble-me`, `.bubble-ai`, `.press`, `.no-scrollbar`, `.shimmer`.
- Wallpapers come from `lib/theme.ts` (`WALLPAPERS`, `wallpaper(id)`, `swatchGradient`). Global wallpaper is `state.wallpaper`; per-character overrides live in `state.characterWallpapers` and win inside chat.
- Fonts: self-hosted Fredoka (display) + Nunito (body) in `app/fonts`, wired as `--font-fredoka` / `--font-nunito` in `app/layout.tsx`.
- Motion respects `state.settings.reduceMotion` (sets `html[data-reduce="1"]`) and CSS `prefers-reduced-motion`.

## Smoke test

1. Welcome → 18+ sign-in → onboarding → Home shows greeting and seeded people.
2. Open a companion → greeting arrives with typing dots → send a message → ticks update → reaction tray by long-press → double-tap sends ❤️.
3. Ask "send me a selfie" with VModel configured → placeholder → photo appears; without a key → graceful failure text.
4. Ask to call → incoming/active call screen → end → summary sheet → recap appears in chat.
5. Create a companion: three steps, voice preview, generate 3 portraits (or skip), share toggle, save → chat opens.
6. Me: switch wallpaper, toggle captions/haptics, memory list, delete data resets to Welcome.
7. `/api/chat` with an empty body returns a valid degraded response; `/api/image/*` returns `image_offline` when unconfigured.
```
