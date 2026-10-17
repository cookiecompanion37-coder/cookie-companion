-- Cookie — Supabase schema (single migration, safe to re-run).
-- Free-tier conscious: narrow rows, covering indexes, denormalised counters,
-- TTL deletes, and service-role-only writes. No images are stored in Postgres.

-- ───────────────────────────────────────────────────────────── characters ──
create table if not exists public.characters (
  id text primary key,
  name text not null,
  age int not null default 22,
  gender text not null default 'female',
  tagline text not null default '',
  bio text not null default '',
  personality text not null default '',
  voice text not null default '',
  greeting text not null default '',
  accent text not null default '#F19AB8',
  emoji text not null default '🌷',
  category text not null default 'Friend',
  photo text,
  gallery text[] not null default '{}',
  appearance text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.characters add column if not exists is_ai boolean not null default false;
alter table public.characters add column if not exists age_band text;
alter table public.characters add column if not exists creator text not null default 'Community';

create index if not exists characters_public_idx on public.characters (is_public, created_at desc);
create index if not exists characters_ai_idx on public.characters (is_ai) where is_ai;

-- ──────────────────────────────────────────────────────────────── stories ──
-- expires_at is duplicated work for the client; the cleanup cron removes rows
-- after 24h so the table never grows beyond ~2 days of posts.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id text,
  author_name text not null,
  author_emoji text not null default '🌷',
  author_accent text not null default '#F19AB8',
  media_url text not null,
  media_path text,
  caption text not null default '',
  scene text not null default '',
  is_ai boolean not null default false,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index if not exists stories_created_idx on public.stories (created_at desc);
create index if not exists stories_cleanup_idx on public.stories (expires_at);
create index if not exists stories_author_idx on public.stories (author_id, created_at desc);

create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id text not null,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_likes_viewer_idx on public.story_likes (viewer_id);

-- One round-trip like toggle. Returns the fresh count so the client never refetches.
create or replace function public.toggle_story_like(p_story uuid, p_viewer text)
returns table (liked boolean, like_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean;
  total int;
begin
  if p_viewer is null or length(p_viewer) < 6 then
    return query select false, 0; return;
  end if;
  if not exists (select 1 from stories where id = p_story and expires_at > now()) then
    return query select false, 0; return;
  end if;

  insert into story_likes (story_id, viewer_id) values (p_story, p_viewer)
  on conflict do nothing;
  inserted := found;

  if inserted then
    update stories set like_count = like_count + 1 where id = p_story returning stories.like_count into total;
    return query select true, coalesce(total, 0);
  else
    delete from story_likes where story_id = p_story and viewer_id = p_viewer;
    update stories set like_count = greatest(0, like_count - 1) where id = p_story returning stories.like_count into total;
    return query select false, coalesce(total, 0);
  end if;
end $$;

-- ───────────────────────────────────────────────────── app-wide key/value ──
-- Used for the story rotator cursor and the daily AI budget. One row per key.
create table if not exists public.app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Atomically consume one slot of a daily budget (e.g. 80 AI stories/day).
create or replace function public.claim_daily_budget(p_key text, p_day text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current int;
begin
  insert into app_state (key, value) values (p_key, jsonb_build_object('day', p_day, 'count', 0))
  on conflict (key) do nothing;

  update app_state
     set value = case
                   when value->>'day' = p_day
                     then jsonb_set(value, '{count}', to_jsonb((value->>'count')::int + 1))
                   else jsonb_build_object('day', p_day, 'count', 1)
                 end,
         updated_at = now()
   where key = p_key
     and (value->>'day' is distinct from p_day or (value->>'count')::int < p_max)
  returning (value->>'count')::int into current;

  return current is not null;
end $$;

-- ────────────────────────────────────────────────────────── call rotator ──
-- 16 physical slots; only the first 14 are handed out (2 headroom).
create table if not exists public.call_slots (
  slot int primary key,
  session_id text,
  character_id text,
  expires_at timestamptz not null default now()
);

insert into public.call_slots (slot) select generate_series(1, 16) on conflict (slot) do nothing;

-- Atomic claim: SKIP LOCKED makes simultaneous claims safe under Fluid concurrency.
create or replace function public.claim_call_slot(p_session text, p_character text, p_ttl int default 120)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned int;
begin
  -- A tab that already holds a slot must keep it; re-claiming is a heartbeat,
  -- never a second slot.
  select slot into assigned
    from call_slots
   where session_id = p_session and expires_at > now()
   order by slot
   limit 1;

  if assigned is not null then
    update call_slots
       set expires_at = now() + make_interval(secs => greatest(30, least(p_ttl, 900)))
     where slot = assigned;
    return assigned;
  end if;

  update call_slots
     set session_id = p_session,
         character_id = p_character,
         expires_at = now() + make_interval(secs => greatest(30, least(p_ttl, 900)))
   where slot = (
     select slot from call_slots
      where slot <= 14 and (session_id is null or expires_at < now())
      order by slot
      limit 1
      for update skip locked
   )
  returning slot into assigned;

  return assigned;
end $$;

create or replace function public.release_call_slot(p_session text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update call_slots set session_id = null, character_id = null, expires_at = now()
   where session_id = p_session;
end $$;

-- Callbacks the model promised when all slots were busy.
create table if not exists public.call_schedules (
  id uuid primary key default gen_random_uuid(),
  character_id text not null,
  character_name text not null default '',
  user_key text not null default 'guest',
  user_name text not null default 'friend',
  due_at timestamptz not null,
  reason text not null default '',
  status text not null default 'pending', -- pending | ringing | connected | missed | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_schedules_due_idx on public.call_schedules (status, due_at);
create index if not exists call_schedules_user_key_idx on public.call_schedules (user_key, status);
create index if not exists call_schedules_user_idx on public.call_schedules (status, updated_at desc);

-- Claim due callbacks atomically (cron) without a read-modify-write race.
create or replace function public.ring_due_callbacks()
returns setof public.call_schedules
language sql
security definer
set search_path = public
as $$
  update call_schedules
     set status = 'ringing', updated_at = now()
   where id in (
     select id from call_schedules
      where status = 'pending' and due_at <= now()
      order by due_at
      limit 10
      for update skip locked
   )
  returning *;
$$;

-- Rings that nobody picked up become missed calls (feeds the Calls tab).
create or replace function public.expire_ringing_callbacks(p_after int default 60)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  changed int;
begin
  update call_schedules
     set status = 'missed', updated_at = now()
   where status = 'ringing'
     and updated_at < now() - make_interval(secs => greatest(20, p_after));
  get diagnostics changed = row_count;
  return changed;
end $$;


-- ───────────────────────────────────────────────────────── story factory ──
-- Random, human-looking plan for the day. One row per intended post; the
-- dispatcher obeys `due_at` and never invents its own cadence.
create table if not exists public.story_plan (
  id uuid primary key default gen_random_uuid(),
  plan_day date not null,
  seq int not null,
  due_at timestamptz not null,
  status text not null default 'pending', -- pending | claimed | done | skipped
  attempts int not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_day, seq)
);

create index if not exists story_plan_due_idx on public.story_plan (status, due_at);
create index if not exists story_plan_day_idx on public.story_plan (plan_day);

-- A render in flight. Jobs survive between short serverless invocations, so no
-- single request has to wait ~400 s for the GPU.
create table if not exists public.story_jobs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.story_plan(id) on delete set null,
  gpu_job_id text not null,
  base_url text not null,
  persona_id text,
  persona_name text not null default '',
  persona_emoji text not null default '🌷',
  persona_accent text not null default '#F19AB8',
  scene text not null default '',
  prompt text not null default '',
  caption text not null default '',
  status text not null default 'rendering', -- rendering | ready | failed
  error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_jobs_status_idx on public.story_jobs (status, created_at);

-- Atomically hand out the next due plan row. Stale claims and slots that missed
-- their window are retired so a dead invocation can never wedge the factory.
create or replace function public.claim_story_slot(p_force boolean default false)
returns setof public.story_plan
language plpgsql
security definer
set search_path = public
as $$
declare
  picked public.story_plan;
begin
  update story_plan set status = 'skipped'
   where status = 'claimed' and claimed_at < now() - interval '30 minutes';

  update story_plan set status = 'skipped'
   where status = 'pending' and due_at < now() - interval '25 minutes';

  select * into picked
    from story_plan
   where status = 'pending' and (p_force or due_at <= now())
   order by due_at
   limit 1
   for update skip locked;

  if picked.id is null then
    return;
  end if;

  update story_plan
     set status = 'claimed', claimed_at = now(), attempts = attempts + 1
   where id = picked.id
   returning * into picked;

  return next picked;
end $$;

-- Give back one unit of the daily budget when a submit fails before the GPU
-- ever saw the job. Keeps retries from silently eating the cap.
create or replace function public.release_daily_budget(p_key text, p_day text)
returns void
language sql
security definer
set search_path = public
as $$
  update app_state
     set value = jsonb_set(value, '{count}', to_jsonb(greatest(0, (value->>'count')::int - 1))),
         updated_at = now()
   where key = p_key and value->>'day' = p_day;
$$;

-- Hand a slot back (GPU still loading, budget contention, …). It stays eligible
-- for 25 minutes; after that claim_story_slot retires it.
create or replace function public.release_story_slot(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update story_plan
     set status = case when attempts >= 20 then 'skipped' else 'pending' end
   where id = p_id and status = 'claimed';
$$;

create or replace function public.finish_story_slot(p_id uuid, p_status text)
returns void
language sql
security definer
set search_path = public
as $$
  update story_plan
     set status = case when p_status = 'done' then 'done' else 'skipped' end
   where id = p_id;
$$;

-- Delete + return expired story paths in one statement. The API then removes
-- the matching objects from storage; 24 h retention keeps the bucket flat.
create or replace function public.take_expired_stories(p_limit int default 200)
returns table (id uuid, media_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  delete from stories s
   using (
     select id from stories
      where expires_at < now()
      order by expires_at
      limit greatest(1, least(p_limit, 500))
      for update skip locked
   ) doomed
   where s.id = doomed.id
  returning s.id, s.media_path;
end $$;

-- ─────────────────────────────────────────────────────────────── policies ──
-- The browser never talks to Postgres directly: all writes go through API
-- routes with the service role. Read access stays narrow and public.
alter table public.characters enable row level security;
alter table public.stories enable row level security;
alter table public.story_likes enable row level security;
alter table public.app_state enable row level security;
alter table public.call_slots enable row level security;
alter table public.call_schedules enable row level security;
alter table public.story_plan enable row level security;
alter table public.story_jobs enable row level security;

drop policy if exists "characters are public" on public.characters;
create policy "characters are public" on public.characters
  for select using (is_public = true);

drop policy if exists "stories are public" on public.stories;
create policy "stories are public" on public.stories
  for select using (expires_at > now());

-- ──────────────────────────────────────────────────────────────── storage ──
-- Story renders live here (public read, service-role write). Files are
-- compressed before upload and served with a 1-year immutable cache header.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cookie-stories', 'cookie-stories', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cookie-photos', 'cookie-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────── housekeeping ──
-- /api/cron/cleanup calls take_expired_stories(), deletes the matching storage
-- objects, then prunes old call rows and finished story jobs. Schedule it hourly
-- with pg_cron (supabase/cron.sql) and daily with vercel.json as a backstop.
