# Cookie — AI Companion

A mobile-first companion app prototype built with the Next.js App Router, strict TypeScript, Tailwind CSS v4, Framer Motion, and Lucide icons. The app shell is designed for a phone viewport; profile, chats, memories, credits, preferences, and call history persist locally under `cookie:v1`.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `ZERO_BASE_URL`, `ZERO_API_KEY`, and `ZERO_MODEL` in `.env.local` for the server-side Zero router. The provided defaults are development placeholders; use a private deployment secret and never expose the key through a `NEXT_PUBLIC_` variable. Chat requests go through the same-origin `POST /api/chat` route, which performs validation, safety checks, rate limiting, response recovery, and sanitization before returning a result.

## Checks

```bash
npm run typecheck
npm run build
```

See [`architecture.md`](./architecture.md) for the runtime boundaries, safety behavior, data model, delivery phases, and manual smoke-test checklist. Fredoka and Nunito variable fonts are self-hosted from the Google Fonts repository with their OFL licenses so production builds do not depend on an external font fetch.
