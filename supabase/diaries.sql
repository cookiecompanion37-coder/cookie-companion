create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 10000),
  mood text not null default 'reflective' check (mood in ('happy','grateful','reflective','low','hopeful')),
  created_at timestamptz not null default now()
);
create index if not exists diaries_user_created on public.diaries(user_id, created_at desc);
alter table public.diaries enable row level security;
create policy diaries_own_select on public.diaries for select to authenticated using ((select auth.uid()) = user_id);
create policy diaries_own_insert on public.diaries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy diaries_own_delete on public.diaries for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.diaries to authenticated;
grant all on public.diaries to service_role;

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy user_state_select on public.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy user_state_insert on public.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_state_update on public.user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_state_delete on public.user_state for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.user_state to authenticated;
grant all on public.user_state to service_role;
