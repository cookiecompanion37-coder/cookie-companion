import { dbConfig, dbCount, dbDelete, dbInsert, dbPatch, dbReady, dbRpc, dbSelect } from "@/lib/server/db";
import { callLLM, recoverJson } from "@/lib/server/llm";
import { buildPersona, buildStoryPrompt, sceneFor, type PersonaSeed, STORY_SCENES } from "@/lib/server/personaFactory";
import { deleteObject, storyBucket, uploadBytes } from "@/lib/server/supabase";
import {
  gpuImageCancel, gpuImageDownload, gpuImageGeneratePoll, gpuImageGenerateSubmit, gpuImageReady,
} from "@/lib/server/gpu";
import { planRemainingDay, utcDay, type PlannedSlot } from "@/lib/server/storyPlan";
import { SEED_CHARACTERS } from "@/lib/seed";

export interface StoryDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorEmoji: string;
  authorAccent: string;
  mediaUrl: string;
  caption: string;
  scene: string;
  isAi: boolean;
  likeCount: number;
  createdAt: number;
  expiresAt: number;
  mine?: boolean;
}

interface StoryRow {
  id: string;
  author_id: string | null;
  author_name: string;
  author_emoji: string;
  author_accent: string;
  media_url: string;
  media_path: string | null;
  caption: string;
  scene: string;
  is_ai: boolean;
  like_count: number;
  created_at: string;
  expires_at: string;
}

const FEED_COLUMNS = "id,author_id,author_name,author_emoji,author_accent,media_url,caption,scene,is_ai,like_count,created_at,expires_at";
const AI_STORY_CAP = Math.max(1, Number(process.env.AI_STORIES_PER_DAY ?? 80));
const AI_STORY_DAILY_TARGET = Math.max(1, Number(process.env.AI_STORY_DAILY_TARGET ?? AI_STORY_CAP));
/** A render older than this is considered dead and is abandoned. */
const JOB_TTL_MS = 25 * 60_000;

/** Every story image is served through our own CDN-cached proxy, never hot-linked. */
export function storyMediaUrl(id: string): string {
  return `/api/stories/media/${id}`;
}

export function toDTO(row: StoryRow): StoryDTO {
  return {
    id: row.id,
    authorId: row.author_id ?? "",
    authorName: row.author_name,
    authorEmoji: row.author_emoji || "🌷",
    authorAccent: row.author_accent || "#F19AB8",
    mediaUrl: /^[0-9a-f-]{36}$/i.test(row.id) ? storyMediaUrl(row.id) : row.media_url,
    caption: row.caption,
    scene: row.scene,
    isAi: row.is_ai,
    likeCount: row.like_count ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

// ─────────────────────────────────────────────────────────────── demo feed ──
/**
 * When Supabase is not configured the app still needs a believable feed. The
 * demo rows are deterministic and never touch storage or the image GPU.
 */
export function demoFeed(limit: number): StoryDTO[] {
  const now = Date.now();
  return SEED_CHARACTERS.slice(0, Math.min(limit, 9)).map((character, index) => {
    const scene = sceneFor(index * 3 + 1, character.gender === "male" ? "male" : "female");
    const createdAt = now - (index + 1) * 47 * 60_000;
    return {
      id: `demo-${character.id}-${scene.id}`,
      authorId: `demo-${character.id}`,
      authorName: character.name,
      authorEmoji: character.emoji,
      authorAccent: character.accent,
      mediaUrl: character.photo ?? "/cookie-logo.png",
      caption: scene.caption,
      scene: scene.id,
      isAi: true,
      likeCount: 18 + ((index * 37) % 240),
      createdAt,
      expiresAt: createdAt + 24 * 60 * 60_000,
      mine: false,
    };
  });
}

// ──────────────────────────────────────────────────────────────────── feed ──
export async function listStories(options: { limit?: number; before?: number } = {}): Promise<StoryDTO[]> {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 48);
  if (!dbReady()) return demoFeed(limit);
  const before = options.before ? new Date(options.before).toISOString() : null;
  const query = [
    `select=${FEED_COLUMNS}`,
    `expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
    before ? `created_at=lt.${encodeURIComponent(before)}` : "",
    "order=created_at.desc",
    `limit=${limit}`,
  ].filter(Boolean).join("&");
  const rows = await dbSelect<StoryRow>("stories", query, 15);
  return rows.map(toDTO);
}

export async function getStoryMedia(id: string): Promise<{ url: string; expiresAt: number } | null> {
  if (!dbReady() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await dbSelect<{ media_url: string; expires_at: string }>(
    "stories",
    `select=media_url,expires_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    60,
  );
  const row = rows[0];
  if (!row || !/^https?:\/\//i.test(row.media_url)) return null;
  return { url: row.media_url, expiresAt: new Date(row.expires_at).getTime() };
}

export interface CreateStoryInput {
  authorId?: string;
  authorName: string;
  authorEmoji?: string;
  authorAccent?: string;
  mediaUrl: string;
  mediaPath?: string;
  caption?: string;
  scene?: string;
  isAi?: boolean;
}

export async function createStory(input: CreateStoryInput): Promise<StoryDTO | null> {
  const mediaUrl = input.mediaUrl.trim();
  if (!/^https?:\/\//i.test(mediaUrl)) return null;
  const accent = input.authorAccent ?? "";
  const row = {
    author_id: input.authorId?.slice(0, 80) ?? null,
    author_name: input.authorName.trim().slice(0, 40) || "Someone",
    author_emoji: (input.authorEmoji ?? "🌷").slice(0, 8),
    author_accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#F19AB8",
    media_url: mediaUrl.slice(0, 500),
    media_path: input.mediaPath?.slice(0, 300) ?? null,
    caption: (input.caption ?? "").slice(0, 140),
    scene: (input.scene ?? "shared-moment").slice(0, 40),
    is_ai: Boolean(input.isAi),
  };
  if (!dbReady()) {
    // Local demo mode: echo a transient story; the client keeps it on-device.
    const now = Date.now();
    return {
      id: `local-${now.toString(36)}`,
      authorId: row.author_id ?? "you",
      authorName: row.author_name,
      authorEmoji: row.author_emoji,
      authorAccent: row.author_accent,
      mediaUrl: row.media_url,
      caption: row.caption,
      scene: row.scene,
      isAi: row.is_ai,
      likeCount: 0,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60_000,
      mine: true,
    };
  }
  const inserted = await dbInsert<StoryRow>("stories", row);
  return inserted[0] ? toDTO(inserted[0]) : null;
}

export async function toggleStoryLike(storyId: string, viewerId: string): Promise<{ liked: boolean; likeCount: number } | null> {
  if (!dbReady() || !/^[0-9a-f-]{36}$/i.test(storyId)) return null;
  const result = await dbRpc<Array<{ liked: boolean; like_count: number }>>("toggle_story_like", {
    p_story: storyId,
    p_viewer: viewerId.slice(0, 64),
  });
  const first = Array.isArray(result) ? result[0] : null;
  return first ? { liked: Boolean(first.liked), likeCount: Number(first.like_count) || 0 } : null;
}

// ──────────────────────────────────────────────────────── AI story pipeline ──
interface CharacterRow {
  id: string; name: string; age: number; gender: string; appearance: string | null;
  photo: string | null; emoji: string | null; accent: string | null; personality: string | null;
  voice: string | null; tagline: string | null; greeting: string | null; category: string | null;
}

function rowToPersona(row: CharacterRow): PersonaSeed {
  const gender = row.gender === "male" || row.gender === "nonbinary" ? row.gender : "female";
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender,
    ageBand: row.age && row.age >= 35 ? "35-49" : row.age && row.age >= 25 ? "25-34" : "18-24",
    tagline: row.tagline ?? "",
    personality: row.personality ?? "",
    voice: row.voice ?? "",
    greeting: row.greeting ?? "",
    accent: row.accent ?? "#F19AB8",
    emoji: row.emoji ?? "🌷",
    category: row.category ?? "Friend",
    appearance: row.appearance ?? "",
    photo: row.photo ?? undefined,
  };
}

// Personas change slowly; a five-minute cache cuts repeated 120-row reads from
// every tick down to a handful per warm instance.
let personaCache: { at: number; value: PersonaSeed[] } | null = null;

async function personaPool(): Promise<PersonaSeed[]> {
  if (personaCache && Date.now() - personaCache.at < 5 * 60_000) return personaCache.value;
  const rows = await dbSelect<CharacterRow>(
    "characters",
    "select=id,name,age,gender,appearance,photo,emoji,accent,personality,voice,tagline,greeting,category&is_ai=eq.true&order=created_at.desc&limit=120",
    120,
  );
  const value = rows.length
    ? rows.map(rowToPersona)
    : SEED_CHARACTERS.map((character, index) =>
      buildPersona({
        index,
        gender: character.gender === "male" ? "male" : character.gender === "nonbinary" ? "nonbinary" : "female",
        ageBand: character.age >= 35 ? "35-49" : character.age >= 25 ? "25-34" : "18-24",
        photo: character.photo,
      }),
    );
  personaCache = { at: Date.now(), value };
  return value;
}

async function aiStoriesToday(): Promise<number> {
  const { start } = utcDay(Date.now());
  return dbCount("stories", `select=id&is_ai=eq.true&created_at=gte.${encodeURIComponent(new Date(start).toISOString())}`);
}

async function lastAiStoryAt(): Promise<number> {
  const rows = await dbSelect<{ created_at: string }>(
    "stories",
    "select=created_at&is_ai=eq.true&order=created_at.desc&limit=1",
    0,
  );
  return rows[0] ? new Date(rows[0].created_at).getTime() : 0;
}

// ────────────────────────────────────────────────────────────── day planner ──
interface PlanRow {
  id: string; plan_day: string; seq: number; due_at: string;
  status: "pending" | "claimed" | "done" | "skipped"; attempts: number;
}

async function hasPlan(dayKey: string): Promise<boolean> {
  const rows = await dbSelect<{ id: string }>(
    "story_plan",
    `select=id&plan_day=eq.${encodeURIComponent(dayKey)}&limit=1`,
    0,
  );
  return rows.length > 0;
}

async function planRowsFor(dayKey: string): Promise<PlanRow[]> {
  return dbSelect<PlanRow>(
    "story_plan",
    `select=id,plan_day,seq,due_at,status,attempts&plan_day=eq.${encodeURIComponent(dayKey)}&order=due_at.asc&limit=120`,
    0,
  );
}

/**
 * Build one random, human-looking schedule per UTC day.
 *
 * `app_state` doubles as the lock: the first invocation to insert today's
 * marker owns plan creation, so two overlapping cron ticks cannot double-plan.
 */
async function ensureDayPlan(): Promise<void> {
  const { key, start } = utcDay(Date.now());
  if (await hasPlan(key)) return;

  const markerKey = `story_plan:${key}`;
  const marker = await dbInsert<{ key: string }>(
    "app_state",
    { key: markerKey, value: { at: Date.now() }, updated_at: new Date().toISOString() },
    { onConflict: "key", ignoreDuplicates: true },
  );
  if (!marker.length) {
    // Another invocation holds the marker. If it died before inserting rows,
    // reclaim it after a short grace period.
    const rows = await dbSelect<{ value: { at?: number } }>("app_state", `select=value&key=eq.${encodeURIComponent(markerKey)}&limit=1`, 0);
    const at = Number(rows[0]?.value?.at ?? 0);
    if (Date.now() - at < 120_000) return;
    await dbDelete("app_state", `key=eq.${encodeURIComponent(markerKey)}`);
    const retry = await dbInsert<{ key: string }>(
      "app_state",
      { key: markerKey, value: { at: Date.now() }, updated_at: new Date().toISOString() },
      { onConflict: "key", ignoreDuplicates: true },
    );
    if (!retry.length) return;
  }

  const [posted, lastEver] = await Promise.all([aiStoriesToday(), lastAiStoryAt()]);
  const slots: PlannedSlot[] = planRemainingDay({
    dayStart: start,
    cap: AI_STORY_CAP,
    alreadyPosted: posted,
    now: Date.now(),
    dailyTarget: AI_STORY_DAILY_TARGET,
    kickstart: lastEver === 0,
  });
  if (!slots.length) return;
  await dbInsert(
    "story_plan",
    slots.map((slot) => ({
      plan_day: key,
      seq: slot.seq,
      due_at: new Date(slot.dueAt).toISOString(),
      status: "pending",
    })),
    { onConflict: "plan_day,seq", ignoreDuplicates: true, returning: false },
  );
}

/** Admin "post now": if today has no plan left, add one slot due immediately. */
async function seedImmediateSlot(): Promise<void> {
  const { key } = utcDay(Date.now());
  const rows = await planRowsFor(key);
  if (rows.some((row) => row.status === "pending" || row.status === "claimed")) return;
  const manual = rows.filter((row) => row.seq >= 9000).length;
  await dbInsert(
    "story_plan",
    { plan_day: key, seq: 9000 + manual, due_at: new Date().toISOString(), status: "pending" },
    { onConflict: "plan_day,seq", ignoreDuplicates: true, returning: false },
  );
}

// ─────────────────────────────────────────────────────────── job lifecycle ──
interface JobRow {
  id: string; plan_id: string | null; gpu_job_id: string; base_url: string;
  persona_id: string | null; persona_name: string; persona_emoji: string; persona_accent: string;
  scene: string; prompt: string; caption: string; status: string; created_at: string;
}

async function activeJobs(): Promise<JobRow[]> {
  return dbSelect<JobRow>(
    "story_jobs",
    "select=id,plan_id,gpu_job_id,base_url,persona_id,persona_name,persona_emoji,persona_accent,scene,prompt,caption,status,created_at&status=eq.rendering&order=created_at.asc&limit=3",
    0,
  );
}

/** Pick a persona and scene that haven't appeared in the last few posts. */
async function pickSubject(): Promise<{ persona: PersonaSeed; scene: (typeof STORY_SCENES)[number] } | null> {
  const personas = await personaPool();
  if (!personas.length) return null;
  const recent = await dbSelect<{ author_id: string | null; scene: string }>(
    "stories",
    "select=author_id,scene&is_ai=eq.true&order=created_at.desc&limit=6",
    0,
  );
  const recentAuthors = new Set(recent.map((row) => row.author_id).filter(Boolean));
  const recentScenes = new Set(recent.map((row) => row.scene).filter(Boolean));

  const personaPoolFiltered = personas.filter((persona) => !recentAuthors.has(persona.id));
  const persona = (personaPoolFiltered.length ? personaPoolFiltered : personas)[Math.floor(Math.random() * (personaPoolFiltered.length || personas.length))]!;
  const candidates = STORY_SCENES.filter((scene) => !recentScenes.has(scene.id) && (
    scene.lean === "any" || (scene.lean === "soft" && persona.gender !== "male") || (scene.lean === "sharp" && persona.gender !== "female")
  ));
  const scene = (candidates.length ? candidates : STORY_SCENES)[Math.floor(Math.random() * (candidates.length || STORY_SCENES.length))]!;
  return { persona, scene };
}

interface RefinedStory { prompt: string; caption: string }

/** One small LLM pass: adapt a canonical scene to this persona's voice. */
async function refineScene(persona: PersonaSeed, scene: (typeof STORY_SCENES)[number], basePrompt: string): Promise<RefinedStory> {
  const raw = await callLLM([
    {
      role: "system",
      content:
        "You adapt everyday phone-photo scenes for a fictional companion's private story. Keep it PG-13, no sexual or violent wording, never mention minors. Return ONLY JSON {\"prompt\":\"...\",\"caption\":\"...\"}. prompt: 25-45 words describing the SCENE and the person's look for an image model, casual smartphone photo, vertical. caption: max 8 lowercase words, in the character's voice, like a real instagram story. Vary the phrasing every time — never reuse the sample caption verbatim.",
    },
    {
      role: "user",
      content: JSON.stringify({
        name: persona.name,
        age: persona.age,
        personality: persona.personality,
        appearance: persona.appearance,
        sceneIdea: scene.prompt,
        basePrompt,
        baseCaption: scene.caption,
      }),
    },
  ]);
  const parsed = raw ? recoverJson(raw) as Partial<RefinedStory> | null : null;
  const prompt = typeof parsed?.prompt === "string" ? parsed.prompt.trim().slice(0, 900) : "";
  const caption = typeof parsed?.caption === "string" ? parsed.caption.trim().slice(0, 140) : "";
  return {
    prompt: prompt.length > 40 ? prompt : basePrompt,
    caption: caption || scene.caption,
  };
}

/**
 * Fetch the persona portrait for img2img so every story keeps the same face.
 * Only relative assets and our own storage host are allowed (no open proxy).
 */
async function referenceImage(photo: string | undefined, origin: string): Promise<Blob | null> {
  if (!photo) return null;
  try {
    let url: URL;
    if (photo.startsWith("/")) {
      url = new URL(photo, origin.endsWith("/") ? origin : `${origin}/`);
    } else if (/^https?:\/\//i.test(photo)) {
      url = new URL(photo);
      const db = dbConfig();
      const allowed = db ? new URL(db.url).hostname : null;
      if (!allowed || url.hostname !== allowed) return null;
    } else return null;

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!response.ok) return null;
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 8 * 1024 * 1024) return null;
    const blob = await response.blob();
    return blob.size > 0 && blob.size <= 8 * 1024 * 1024 ? blob : null;
  } catch { return null; }
}

async function nextDueSlot(force: boolean): Promise<boolean> {
  const now = encodeURIComponent(new Date().toISOString());
  const rows = await dbSelect<{ id: string }>(
    "story_plan",
    force
      ? "select=id&status=eq.pending&order=due_at.asc&limit=1"
      : `select=id&status=eq.pending&due_at=lte.${now}&order=due_at.asc&limit=1`,
    0,
  );
  return rows.length > 0;
}

async function submitJob(origin: string, force = false): Promise<{ ok: boolean; reason: string }> {
  // Cheapest possible gate first: is anything actually due? Only then wake the
  // GPU. Most ticks stop at this one indexed read.
  if (!await nextDueSlot(force)) return { ok: false, reason: "not_due" };

  const gpu = await gpuImageReady();
  if (!gpu) return { ok: false, reason: "gpu_offline" };
  if (!gpu.ready) return { ok: false, reason: "gpu_loading" };

  const subject = await pickSubject();
  if (!subject) return { ok: false, reason: "no_personas" };
  const { persona, scene } = subject;

  const claimed = await dbRpc<PlanRow[] | PlanRow | null>("claim_story_slot", { p_force: force });
  const slot = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!slot) return { ok: false, reason: "not_due" };

  const { key } = utcDay(Date.now());
  const budget = await dbRpc<boolean>("claim_daily_budget", { p_key: "ai_stories", p_day: key, p_max: AI_STORY_CAP });
  if (budget === false) {
    await dbRpc("finish_story_slot", { p_id: slot.id, p_status: "skipped" });
    return { ok: false, reason: "daily_cap" };
  }

  const basePrompt = buildStoryPrompt({ scene, persona });
  const refined = await refineScene(persona, scene, basePrompt);
  const reference = await referenceImage(persona.photo, origin);
  const submitted = await gpuImageGenerateSubmit(refined.prompt, {
    ar: "9:16",
    side: 1024,
    format: "jpeg",
    seed: Math.floor(Math.random() * 2_000_000_000),
    image: reference ?? undefined,
  });

  if (!submitted) {
    await dbRpc("release_daily_budget", { p_key: "ai_stories", p_day: key });
    await dbRpc("release_story_slot", { p_id: slot.id });
    return { ok: false, reason: "gpu_submit_failed" };
  }

  const inserted = await dbInsert<JobRow>("story_jobs", {
    plan_id: slot.id,
    gpu_job_id: submitted.jobId,
    base_url: submitted.base,
    persona_id: persona.id,
    persona_name: persona.name,
    persona_emoji: persona.emoji,
    persona_accent: persona.accent,
    scene: scene.id,
    prompt: refined.prompt,
    caption: refined.caption,
    status: "rendering",
  });
  if (!inserted.length) {
    await gpuImageCancel(submitted.base, submitted.jobId);
    await dbRpc("release_daily_budget", { p_key: "ai_stories", p_day: key });
    await dbRpc("release_story_slot", { p_id: slot.id });
    return { ok: false, reason: "job_tracking_failed" };
  }
  return { ok: true, reason: "submitted" };
}

async function failJob(job: JobRow, error: string): Promise<void> {
  await gpuImageCancel(job.base_url, job.gpu_job_id);
  await dbPatch("story_jobs", `id=eq.${encodeURIComponent(job.id)}`, {
    status: "failed", error: error.slice(0, 200), updated_at: new Date().toISOString(),
  });
  if (job.plan_id) await dbRpc("finish_story_slot", { p_id: job.plan_id, p_status: "skipped" });
}

/** Poll one or two in-flight renders and publish anything the GPU finished. */
async function pollJobs(): Promise<{ published: number; failed: number }> {
  const jobs = await activeJobs();
  let published = 0;
  let failed = 0;

  for (const job of jobs.slice(0, 2)) {
    const age = Date.now() - new Date(job.created_at).getTime();
    const status = await gpuImageGeneratePoll(job.base_url, job.gpu_job_id);

    if (status.status === "failed") {
      await failJob(job, status.error ?? "render_failed");
      failed += 1;
      continue;
    }
    if (status.status !== "done") {
      if (age > JOB_TTL_MS) { await failJob(job, "render_timeout"); failed += 1; }
      continue;
    }

    const imageUrl = status.imageUrl;
    if (!imageUrl) { await failJob(job, "missing_image"); failed += 1; continue; }
    const remote = await gpuImageDownload(job.base_url, imageUrl);
    if (!remote) { await failJob(job, "download_failed"); failed += 1; continue; }

    const bytes = new Uint8Array(await remote.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
      await failJob(job, "bad_image_size");
      failed += 1;
      continue;
    }
    const contentType = remote.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    const stored = await uploadBytes(bytes, contentType, `stories/${new Date().toISOString().slice(0, 10)}`, storyBucket());
    if (!stored) { await failJob(job, "storage_failed"); failed += 1; continue; }

    const story = await createStory({
      authorId: job.persona_id ?? undefined,
      authorName: job.persona_name,
      authorEmoji: job.persona_emoji,
      authorAccent: job.persona_accent,
      mediaUrl: stored.url,
      mediaPath: stored.path,
      caption: job.caption,
      scene: job.scene,
      isAi: true,
    });
    if (!story) { await failJob(job, "insert_failed"); failed += 1; continue; }

    await dbPatch("story_jobs", `id=eq.${encodeURIComponent(job.id)}`, {
      status: "ready", updated_at: new Date().toISOString(),
    });
    if (job.plan_id) await dbRpc("finish_story_slot", { p_id: job.plan_id, p_status: "done" });
    published += 1;
  }
  return { published, failed };
}

// ────────────────────────────────────────────────────────────────── status ──
export interface StoryStatus {
  configured: boolean;
  today: number;
  cap: number;
  planned: number;
  nextAt: number;
  inFlight: number;
  lastAt: number;
  scenes: number;
}

export async function storyStatus(): Promise<StoryStatus> {
  if (!dbReady()) {
    return {
      configured: false, today: 0, cap: AI_STORY_CAP, planned: 0, nextAt: 0,
      inFlight: 0, lastAt: 0, scenes: STORY_SCENES.length,
    };
  }
  const { key } = utcDay(Date.now());
  const [today, lastAt, plan, jobs] = await Promise.all([aiStoriesToday(), lastAiStoryAt(), planRowsFor(key), activeJobs()]);
  const upcoming = plan.filter((row) => row.status === "pending").sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  return {
    configured: true,
    today,
    cap: AI_STORY_CAP,
    planned: plan.filter((row) => row.status === "pending" || row.status === "claimed").length,
    nextAt: upcoming[0] ? new Date(upcoming[0].due_at).getTime() : 0,
    inFlight: jobs.length,
    lastAt,
    scenes: STORY_SCENES.length,
  };
}

// ──────────────────────────────────────────────────────────────── the tick ──
export interface StoryRunResult {
  ok: boolean;
  reason: string;
  published?: number;
  failed?: number;
  today?: number;
  cap?: number;
  planned?: number;
  nextAt?: number;
}

/**
 * One cheap, idempotent tick. Called every couple of minutes by Supabase
 * pg_cron and, opportunistically, by the feed route.
 *
 * It does two things and returns fast:
 *   1. publishes any render the GPU has finished (and copies the bytes into
 *      Supabase storage — the GPU URL dies after ~20 minutes);
 *   2. if no render is in flight and a planned slot is due, submits the next one.
 *
 * No request ever waits ~400 s for an image, which is what lets this run on
 * Vercel's free function limits.
 */
export async function runStoryCron(options: { origin?: string; force?: boolean } = {}): Promise<StoryRunResult> {
  if (!dbReady()) return { ok: false, reason: "db_offline" };

  const polled = await pollJobs();
  await ensureDayPlan();

  const jobs = await activeJobs();
  if (jobs.length) {
    // One render at a time: the GPU batches sequentially and a queued second
    // job would only make both late.
    const status = await storyStatus();
    return { ok: false, reason: "in_flight", ...polled, today: status.today, cap: status.cap, planned: status.planned, nextAt: status.nextAt };
  }

  const origin = options.origin ?? process.env.SITE_URL ?? "http://localhost:3000";
  if (options.force) await seedImmediateSlot();
  const submitted = await submitJob(origin, options.force);
  const status = await storyStatus();
  return {
    ok: submitted.ok,
    reason: submitted.reason,
    ...polled,
    today: status.today,
    cap: status.cap,
    planned: status.planned,
    nextAt: status.nextAt,
  };
}

// ──────────────────────────────────────────────────────────────── cleanup ──
export async function cleanupStories(): Promise<{ rows: number; files: number }> {
  if (!dbReady()) return { rows: 0, files: 0 };
  const expired = await dbRpc<Array<{ id: string; media_path: string | null }>>("take_expired_stories", { p_limit: 300 });
  const rows = Array.isArray(expired) ? expired : [];
  let files = 0;
  // Storage deletes are small HTTP calls; a few at a time is plenty and keeps
  // the function well inside its budget.
  for (let index = 0; index < rows.length; index += 8) {
    const chunk = rows.slice(index, index + 8).filter((row) => row.media_path);
    const results = await Promise.all(chunk.map((row) => deleteObject(row.media_path!)));
    files += results.filter(Boolean).length;
  }
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  await dbDelete("call_schedules", `status=neq.pending&updated_at=lt.${encodeURIComponent(threeDaysAgo)}`);
  await dbDelete("story_jobs", `status=neq.rendering&updated_at=lt.${encodeURIComponent(threeDaysAgo)}`);
  await dbDelete("story_plan", `plan_day=lt.${new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)}`);
  return { rows: rows.length, files };
}
