-- Cookie — scheduling, entirely on Supabase + Vercel.
--
-- Run this once after schema.sql. No GitHub Actions, no external cron service.
--
--   Postgres (pg_cron)  ──pg_net──▶  Vercel route  ──▶  Supabase / GPU
--
-- The story tick is every two minutes so a due slot is picked up quickly; the
-- route itself checks "is a render already running / is a slot actually due",
-- so extra pings do nothing and cost a few milliseconds.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─────────────────────────────────────────────────────────────── secrets ──
-- Replace both values once. They live in Supabase Vault, not in the repo.
-- (URL: your deployed Vercel origin, no trailing slash. Secret: CRON_SECRET.)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cookie_site_url') then
    perform vault.create_secret('https://your-app.vercel.app', 'cookie_site_url', 'Cookie deployment origin');
  end if;
  if not exists (select 1 from vault.secrets where name = 'cookie_cron_secret') then
    perform vault.create_secret('replace-with-your-CRON_SECRET', 'cookie_cron_secret', 'Bearer token for /api/cron/*');
  end if;
end $$;

-- ────────────────────────────────────────────────────────────── dispatcher ──
create or replace function public.cookie_cron_tick(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  site text;
  secret text;
  request_id bigint;
begin
  select decrypted_secret into site   from vault.decrypted_secrets where name = 'cookie_site_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cookie_cron_secret';

  if site is null or secret is null or site like 'https://your-app%' then
    raise notice 'cookie_cron_tick: set cookie_site_url and cookie_cron_secret in Vault first';
    return null;
  end if;

  select net.http_post(
    url := rtrim(site, '/') || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  ) into request_id;

  return request_id;
end $$;

-- This function is only for the scheduler; it is not part of the public API.
revoke all on function public.cookie_cron_tick(text) from anon, authenticated;

-- ────────────────────────────────────────────────────────────── schedules ──
-- Re-running this file replaces the jobs instead of stacking duplicates.
select cron.unschedule(jobid)
  from cron.job
 where jobname in ('cookie-stories', 'cookie-calls', 'cookie-cleanup');

select cron.schedule('cookie-stories', '*/2 * * * *', $$select public.cookie_cron_tick('/api/cron/stories')$$);
select cron.schedule('cookie-calls',   '* * * * *',   $$select public.cookie_cron_tick('/api/cron/calls')$$);
select cron.schedule('cookie-cleanup', '7 * * * *',   $$select public.cookie_cron_tick('/api/cron/cleanup')$$);

-- ─────────────────────────────────────────────────────────────── checking ──
-- select jobname, schedule, active from cron.job;
-- select status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;
-- select * from net._http_response order by created desc limit 10;
