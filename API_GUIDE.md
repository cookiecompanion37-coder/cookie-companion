# Cookie Companion — Complete API Guide

This guide documents all available API endpoints for **Cookie Companion**, covering both the **Next.js App Router API Routes** (`/api/*`) and the underlying **GPU Node Backend** (`/v1/*`).

---

## Architecture Overview

```
                                      ┌──────────────────────────────────────────────┐
                                      │           Supabase Node Registry             │
                                      │  (Stores live ephemeral Cloudflare URL)      │
                                      └──────────────────────┬───────────────────────┘
                                                             │ resolves BASE
                                                             ▼
┌──────────────────┐               ┌─────────────────────────────────────────────────┐
│                  │  /api/chat    │          Next.js Web Server                     │
│                  ├──────────────►│  - Safety & Rate Limiting                       │
│                  │               │  - Zero LLM Orchestration                       │
│                  │               ├─────────────────────────────────────────────────┤
│   Browser Client │  /api/gpu/*   │  Server Proxies (Keeps GPU URL / tokens secure) │
│                  ├──────────────►│  - /api/gpu/voice                               │
│                  │               │  - /api/gpu/image                               │
│                  │               │  - /api/gpu/tts                                 │
│                  │               │  - /api/gpu/call                                │
│                  │               └────────────────────────┬────────────────────────┘
│                  │                                        │ Proxied HTTP requests
│                  │   Direct WebSocket (Low Latency)       ▼
│                  │◄══════════════════════════════► ┌───────────────────────────────┐
│                  │   wss://{BASE}/v1/call/ws       │    GPU Companion Server       │
│                  │                                 │  - Whisper STT                │
│                  │                                 │  - Llama 3 / Mistral LLM      │
│                  │                                 │  - Kokoro / F5 TTS            │
│                  │                                 │  - SD / FLUX Image Gen        │
└──────────────────┘                                 └───────────────────────────────┘
```

---

## Part 1: Next.js API Routes (`/api/*`)

These routes run within the Next.js server (`cookie companion website`). They handle validation, rate-limiting, safety filtering, and secure proxying.

### 1. `POST /api/chat`
Handles text chat turns, personality prompting, safety prechecks, and memory updates.

- **URL:** `/api/chat`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Payload Schema (`ChatRequest`):**
  ```json
  {
    "character": {
      "name": "Cookie",
      "personality": "warm, playful, caring companion",
      "voice": "soft British female",
      "age": 22,
      "gender": "female"
    },
    "messages": [
      { "role": "user", "text": "Hey Cookie, how was your day?" }
    ],
    "callState": {
      "status": "idle",
      "secondsLeft": 180,
      "busyRoll": false,
      "callsToday": 1
    },
    "userName": "Alex",
    "event": "message",
    "mode": "chat",
    "memory": ["Alex likes matcha latte", "Works in design"],
    "localTime": "16:30"
  }
  ```
- **Response Schema (`ChatResponse`):**
  ```json
  {
    "bubbles": [
      "Hey Alex! It was pretty nice, just baking up some new thoughts 🍪",
      "How did your design meeting go today?"
    ],
    "reaction": "warm",
    "call": "none",
    "callbackInSec": null,
    "memory": ["Alex likes matcha latte", "Works in design"],
    "quickReplies": ["It went great!", "Super tiring", "Tell me more about your day"],
    "safety": "ok",
    "mood": "happy"
  }
  ```
- **Safety Precheck:** If user triggers minor safety guardrails, returns a safe educational response with `"safety": "minor"`.

---

### 2. `POST /api/gpu/voice`
Server proxy for voice messages. Accepts recorded user audio, forwards to GPU Whisper STT + LLM + TTS, and returns the response with resolved audio URL.

- **URL:** `/api/gpu/voice`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `audio` *(required, File)*: WebM/WAV/MP3 audio blob (max 10MB).
  - `session_id` *(optional, string)*: Persistent conversation ID.
  - `system_prompt` *(optional, string)*: Character persona prompt.
  - `reply_mode` *(optional, string)*: `"voice_text"` (default), `"voice_only"`, `"text_only"`.
- **Response:**
  ```json
  {
    "session_id": "sess_12345",
    "transcript": "What are you doing right now?",
    "reply": {
      "text": "Just relaxing and waiting to talk with you! What's up?",
      "emoji": "✨",
      "audio_path": "https://<GPU_URL>/audio/reply_sess_12345.wav"
    },
    "reaction": { "mood": "happy" },
    "duration_s": 2.1
  }
  ```

---

### 3. `POST /api/gpu/image`
Dual-mode image endpoint supporting both **multimodal image analysis** and **AI image generation / polling**.

#### Mode A: Multimodal Image Analysis (Multipart)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image` *(required, File)*: JPEG/PNG/WebP image (max 20MB).
  - `caption` *(optional, string)*: Text prompt or query about image.
  - `audio` *(optional, File)*: Voice recording asking about the image.
  - `session_id` *(optional, string)*: Session ID.
- **Response:**
  ```json
  {
    "session_id": "sess_12345",
    "caption_used": "What do you think of my outfit?",
    "reply": {
      "text": "That look suits you so well! Love the color combo 😍",
      "emoji": "👗",
      "audio_path": "https://<GPU_URL>/audio/reply_sess_12345.wav"
    },
    "reaction": { "mood": "excited" }
  }
  ```

#### Mode B: Text-to-Image Generation (JSON)
- **Content-Type:** `application/json`
- **Submit Request:**
  ```json
  {
    "action": "generate",
    "prompt": "Cookie character enjoying coffee in a cozy bakery, anime style",
    "side": 1536,
    "ar": "9:16"
  }
  ```
- **Submit Response:**
  ```json
  {
    "jobId": "job_abc123",
    "base": "https://xxxx.trycloudflare.com"
  }
  ```
- **Poll Request:**
  ```json
  {
    "action": "poll",
    "jobId": "job_abc123",
    "base": "https://xxxx.trycloudflare.com"
  }
  ```
- **Poll Response (When complete):**
  ```json
  {
    "status": "done",
    "image_url": "https://xxxx.trycloudflare.com/generated/job_abc123.png"
  }
  ```

---

### 4. `POST /api/gpu/tts`
Text-to-Speech voice preview synthesis. Converts text directly into playable audio bytes.

- **URL:** `/api/gpu/tts`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "voice_description": "warm British female, mid-20s, playful",
    "text": "Hello Alex! I am so happy to hear from you."
  }
  ```
- **Response:** Binary audio stream (`Content-Type: audio/wav`). Playable directly via `new Audio(URL.createObjectURL(blob))` or HTML `<audio>` element.

---

### 5. `POST /api/gpu/call`
Initializes a real-time duplex voice call session and provisions the WebSocket gateway URL.

- **URL:** `/api/gpu/call`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "session_id": "sess_alex_cookie",
    "system_prompt": "You are Cookie, a caring AI companion. Keep answers conversational and concise for a phone call.",
    "voice_description": "warm British female, mid-20s, playful"
  }
  ```
- **Response:**
  ```json
  {
    "sessionId": "sess_alex_cookie",
    "ws": "wss://xxxx.trycloudflare.com/v1/call/ws?session=sess_alex_cookie"
  }
  ```

---

## Part 2: GPU Node Live Backend (`/v1/*`)

The GPU server runs model inference (Whisper STT, LLM, Kokoro TTS, Diffusion).

### Dynamic URL Resolution via Supabase
Because GPU tunnels (e.g., Cloudflare Tunnel) refresh dynamically, the live node URL is registered in Supabase:

- **Supabase Project:** `https://xiwpzkuuoiwwwkrbphbp.supabase.co`
- **Query:**
  ```bash
  curl "https://xiwpzkuuoiwwwkrbphbp.supabase.co/rest/v1/active_nodes?id=eq.0&select=node_url&limit=1" \
    -H "apikey: <SUPABASE_ANON_KEY>" \
    -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
  ```
- **Result:** `[{"node_url":"https://xxxx.trycloudflare.com"}]`

### WebSocket Real-time Voice Call Protocol
Connect to: `wss://{BASE}/v1/call/ws?session={sessionId}`

#### Handshake Sequence:
1. Client connects via WebSocket (`binaryType = 'arraybuffer'`).
2. Client sends: `{"type": "hello"}`
3. Client sends: `{"type": "live"}` to start audio streaming.
4. Client records microphone: PCM 16-bit mono @ 16,000 Hz, sends raw `Int16Array.buffer` chunks.
5. Server sends text state and binary audio:
   - `{"type": "state", "v": "listening" | "hearing" | "thinking" | "speaking"}`
   - `{"type": "user", "text": "transcription..."}`
   - `{"type": "bot", "text": "companion answer..."}`
   - **Binary Frames:** PCM 16-bit mono @ 24,000 Hz (playable directly to speakers).
6. To terminate call: `{"type": "hangup"}`.

### Health Check Endpoint
- **URL:** `GET {BASE}/v1/health`
- **Response:**
  ```json
  {
    "ok": true,
    "tts": true,
    "llm": { "name": "meta-llama/Meta-Llama-3.1-8B-Instruct" },
    "calls": 0
  }
  ```
