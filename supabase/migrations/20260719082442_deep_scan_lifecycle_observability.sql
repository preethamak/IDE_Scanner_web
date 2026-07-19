alter table public.scan_jobs
  add column if not exists lifecycle_stage text not null default 'queued',
  add column if not exists dispatch_count integer not null default 0,
  add column if not exists dispatch_requested_at timestamptz,
  add column if not exists dispatch_succeeded_at timestamptz,
  add column if not exists result_received_at timestamptz,
  add column if not exists callback_error text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_event_at timestamptz not null default now();

do $$ begin
  alter table public.scan_jobs add constraint scan_jobs_lifecycle_stage_check
    check (lifecycle_stage in ('queued','dispatching','dispatched','analyzing','ingesting','completed','failed'));
exception when duplicate_object then null; end $$;

create table if not exists public.scan_job_subscribers (
  job_id uuid not null references public.scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
alter table public.scan_job_subscribers enable row level security;
drop policy if exists "own scan job subscriptions" on public.scan_job_subscribers;
create policy "own scan job subscriptions" on public.scan_job_subscribers
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.scan_job_subscribers from anon, authenticated;
grant select on table public.scan_job_subscribers to authenticated;
grant all on table public.scan_job_subscribers to service_role;

insert into public.scan_job_subscribers(job_id, user_id)
select id, requested_by from public.scan_jobs where requested_by is not null
on conflict do nothing;

create table if not exists public.scan_job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.scan_jobs(id) on delete cascade,
  stage text not null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists scan_job_events_job_created on public.scan_job_events(job_id, created_at desc);
alter table public.scan_job_events enable row level security;
revoke all on table public.scan_job_events from public, anon, authenticated;
grant all on table public.scan_job_events to service_role;

create table if not exists public.scan_callback_receipts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.scan_jobs(id) on delete cascade,
  payload_sha256 text not null,
  outcome text not null default 'received' check (outcome in ('received','accepted','rejected')),
  error text,
  received_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists scan_callback_receipts_job_received on public.scan_callback_receipts(job_id, received_at desc);
alter table public.scan_callback_receipts enable row level security;
revoke all on table public.scan_callback_receipts from public, anon, authenticated;
grant all on table public.scan_callback_receipts to service_role;

create or replace function public.claim_deep_scan_job(
  p_runner_id text,
  p_job_id uuid default null,
  p_github_run_id bigint default null
)
returns public.scan_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.scan_jobs;
  stale record;
begin
  if p_runner_id is null or p_runner_id !~ '^[a-zA-Z0-9._:-]{1,120}$' then
    raise exception 'Invalid runner identity';
  end if;

  for stale in
    update public.scan_jobs
    set status = 'failed', lifecycle_stage = 'failed',
        error = 'The Deep Scan runner stopped before returning a result. Retry the scan.',
        completed_at = now(), lease_expires_at = null,
        updated_at = now(), last_event_at = now()
    where status = 'running' and lease_expires_at < now()
    returning id, extension_id, version
  loop
    insert into public.scan_job_events(job_id, stage, event_type, detail)
    values (stale.id, 'failed', 'lease_expired', jsonb_build_object('extension_id', stale.extension_id, 'version', stale.version));
    update public.extension_versions set scan_state = 'failed'
    where extension_id = stale.extension_id and version = stale.version and scan_state = 'running';
  end loop;

  insert into public.scan_runner_status(id, last_seen_at)
  values ('github-actions', now())
  on conflict(id) do update set last_seen_at = excluded.last_seen_at;

  if p_job_id is not null then
    select * into claimed from public.scan_jobs
    where id = p_job_id and profile = 'deep' and status = 'queued'
    for update skip locked;
  else
    select * into claimed from public.scan_jobs
    where profile = 'deep' and status = 'queued'
    order by (requested_by is null) asc, created_at asc
    for update skip locked limit 1;
  end if;

  if claimed.id is null then return null; end if;

  update public.scan_jobs
  set status = 'running', lifecycle_stage = 'analyzing', runner_id = p_runner_id,
      github_run_id = coalesce(p_github_run_id, github_run_id),
      attempt_count = attempt_count + 1, started_at = coalesce(started_at, now()),
      lease_expires_at = now() + interval '30 minutes', error = null,
      updated_at = now(), last_event_at = now()
  where id = claimed.id returning * into claimed;

  insert into public.scan_job_events(job_id, stage, event_type, detail)
  values (claimed.id, 'analyzing', 'claimed', jsonb_build_object('runner_id', p_runner_id, 'github_run_id', p_github_run_id));
  update public.extension_versions set scan_state = 'running'
  where extension_id = claimed.extension_id and version = claimed.version;
  update public.scan_runner_status set last_claimed_at = now() where id = 'github-actions';
  return claimed;
end;
$$;
revoke all on function public.claim_deep_scan_job(text,uuid,bigint) from public, anon, authenticated;
grant execute on function public.claim_deep_scan_job(text,uuid,bigint) to service_role;

create or replace function public.deep_scan_queue_position(p_job_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select id, created_at, requested_by from public.scan_jobs where id = p_job_id and status = 'queued'
  )
  select case when not exists(select 1 from target) then 0 else 1 + count(*) end
  from public.scan_jobs j cross join target t
  where j.status = 'queued' and j.profile = 'deep' and j.id <> t.id
    and (
      (t.requested_by is not null and j.requested_by is not null and j.created_at < t.created_at)
      or (t.requested_by is null and (j.requested_by is not null or (j.requested_by is null and j.created_at < t.created_at)))
    );
$$;
revoke all on function public.deep_scan_queue_position(uuid) from public, anon, authenticated;
grant execute on function public.deep_scan_queue_position(uuid) to service_role;

create or replace function public.increment_scan_dispatch_count(p_job_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.scan_jobs
  set dispatch_count = dispatch_count + 1, updated_at = now(), last_event_at = now()
  where id = p_job_id and status = 'queued';
$$;
revoke all on function public.increment_scan_dispatch_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_scan_dispatch_count(uuid) to service_role;

create index if not exists scan_jobs_user_queue_priority
  on public.scan_jobs(created_at asc) where profile = 'deep' and status = 'queued' and requested_by is not null;
