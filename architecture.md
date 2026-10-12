# Cookie — architecture and implementation notes

## Product boundary
Cookie is a mobile-first, local-first AI companion prototype built as a Next.js App Router application. The interface is designed as an app shell (safe areas, one-hand navigation, touch-sized controls, spring transitions), not as a responsive marketing site. The persistent user profile, chats, companion definitions, memories, settings, credits, and call history live in one versioned localStorage record (`cookie:v1`). There is no database, auth provider, analytics, or billing integration in this implementation. Fredoka and Nunito are self-hosted variable fonts sourced from the Google Fonts repository (their OFL license files are included) and loaded through `next/font/local` so production builds remain deterministic without depending on Google Fonts network access.

## Runtime layers

```text
app/page.tsx
  └── AppShell (client composition root)
      ├── NavProvider + ToastProvider + EngineProvider
      ├── splash / welcome / sign-in / onboarding / main tab screens
      ├── ScreenStack + TabBar + SheetHost
      ├── FxHost + incoming-call / active-call overlays
      └── state sync: AppState ↔ cookie:v1

ChatScreen / call UI
  └── EngineProvider (client orchestration)
      └── POST /api/chat (same-origin; timeout + degraded response)
          ├── request validation + byte cap + per-IP rate limit
          ├── safety precheck (minor is stopped, crisis is escalated)
          ├── buildSystemPrompt + Zero router adapter
          └── JSON recovery + schema normalization + call-rule enforcement
```

The browser never receives or references the Zero API key or model URL. The only model request is made by `lib/server/llm.ts` from the route handler. `ZERO_BASE_URL`, `ZERO_API_KEY`, and `ZERO_MODEL` are server environment variables; the supplied endpoint, key, and model are defaults for development and may be overridden in deployment. Never put the key in a `NEXT_PUBLIC_` variable or commit a real production secret.

## Data and state
- `lib/types.ts` is the shared, browser-safe data contract. Server-only code may import these types but cannot import UI modules.
- `lib/store.ts` owns one cached `AppState` snapshot. Hydration is lazy and client-only; snapshot identity changes only in `setState`/storage sync. Writes are debounced. Reset returns the app to the default welcome state.
- `lib/credits.ts` is pure accounting: local-midnight daily text/call refill, welcome bonus, plan pool, and non-expiring purchased packs. Call spending drains those pools in that order.
- `lib/nav.tsx` owns ephemeral screen, route, and sheet navigation; it is intentionally not persisted.
- `lib/engine/*` owns async message batching, typing/read receipts, callbacks, and live call sessions. Timers and media tracks are cleaned up when the provider unmounts.

## AI request contract and safety
1. The client sends a bounded `ChatRequest` to `/api/chat`; the route validates it manually and rejects malformed/oversized data with a safe 200 fallback.
2. A user who states they are under 18 receives a local safety response and is never sent to the model. Crisis language is still sent for a supportive response, but the response safety field is forced to `crisis` so the client can display resources.
3. The server uses the OpenAI-compatible `POST {ZERO_BASE_URL}/chat/completions` protocol. It discards reasoning fields, strips `<think>` tags, retries once with a larger token budget if content is empty, and never forwards provider errors or credentials.
4. JSON recovery tolerates fenced output and trailing commas. Sanitization caps bubbles/replies/memory, validates enums, strips call-mode emoji/markdown, and enforces busy/ring/callback rules independently of model output.
5. The route has a 20 KB request cap, an in-memory 20 requests/minute IP limiter, and a 28-second provider timeout. This limiter is per process and is not a substitute for a shared production rate limiter.
6. The client has a 30-second request timeout and a deterministic degraded reply. The UI must never hang if the model endpoint is unavailable.

## Compliance and product guardrails
The app gates sign-in at 18+, keeps an “AI companion” label in chat, inserts an AI disclosure note into each new conversation, provides crisis resources and reporting, supports deleting all local data, and avoids manipulative retention language. The sign-in, purchase, persistence, and GPU-voice integrations are clearly marked as mock/local-only; production auth, payment, shared rate limiting, moderation review, and GPU voice require separately configured services.

## Delivery phases
1. Foundation: contracts, theme, deterministic seed data, local state, utilities, audio/voice primitives.
2. UI kit: cookie mascot, clay controls, sheets, toast, effects, navigation primitives.
3. Server: prompt, safety checks, Zero API adapter, response recovery/sanitization, rate limit, route.
4. Engine: chat request fallback, timers, message orchestration, and call-session primitives.
5. Conversation UI: chat bubbles/composer/reactions and call surfaces.
6. Screens and sheets: onboarding, discovery, chat, calls, profile, create flow, memory, paywall, safety.
7. App shell: providers, route composition, overlays, manifest, final end-to-end verification.

## Verification plan
`npm run typecheck` validates strict TypeScript and import boundaries; `npm run build` validates the production App Router build. API behavior is checked with pure safety/sanitization tests executed through focused Node scripts during development (no throwaway test suite is retained). Manual smoke checks cover first-visit onboarding, page refresh persistence, creating and chatting with a companion, unread/read state, daily credits, offline model fallback, call busy/callback/missed/answered states, minor gate, crisis resources, report, and delete-data reset.
