alter table public.team_monitoring_preferences
  add column if not exists weekly_digest boolean not null default false,
  add column if not exists digest_weekday smallint not null default 1 check (digest_weekday between 1 and 7),
  add column if not exists digest_hour_utc smallint not null default 9 check (digest_hour_utc between 0 and 23);

create table if not exists public.team_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  channel_id uuid not null references public.team_notification_channels(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, channel_id, period_start)
);

create index if not exists team_digest_deliveries_dispatch
  on public.team_digest_deliveries(status, next_attempt_at)
  where status in ('pending', 'failed');

alter table public.team_digest_deliveries enable row level security;
drop policy if exists "members read team digest deliveries" on public.team_digest_deliveries;
create policy "members read team digest deliveries" on public.team_digest_deliveries
  for select to authenticated using (private.is_team_member(team_id));
grant select on public.team_digest_deliveries to authenticated;

create or replace function public.queue_team_weekly_digests(target_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued integer := 0;
begin
  with schedules as (
    select
      p.team_id,
      (date_trunc('week', target_now at time zone 'UTC') at time zone 'UTC')
        + ((p.digest_weekday - 1)::text || ' days')::interval
        + (p.digest_hour_utc::text || ' hours')::interval as due_at
    from public.team_monitoring_preferences p
    where p.weekly_digest = true
  )
  insert into public.team_digest_deliveries(team_id, channel_id, period_start, period_end)
  select s.team_id, c.id, s.due_at - interval '7 days', s.due_at
  from schedules s
  join public.team_notification_channels c on c.team_id = s.team_id
  where target_now >= s.due_at
    and c.enabled = true
    and c.kind in ('slack_webhook', 'email_resend')
  on conflict (team_id, channel_id, period_start) do nothing;

  get diagnostics queued = row_count;
  return queued;
end;
$$;

revoke all on function public.queue_team_weekly_digests(timestamptz) from public, anon, authenticated;
grant execute on function public.queue_team_weekly_digests(timestamptz) to service_role;
