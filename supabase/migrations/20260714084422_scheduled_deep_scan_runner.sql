alter table public.scan_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists runner_id text,
  add column if not exists lease_expires_at timestamptz;

create table if not exists public.scan_runner_status (
  id text primary key,
  last_seen_at timestamptz not null,
  last_claimed_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  check (id = 'github-actions')
);

alter table public.scan_runner_status enable row level security;
revoke all on table public.scan_runner_status from public, anon, authenticated;
grant all on table public.scan_runner_status to service_role;

create or replace function public.claim_next_deep_scan(p_runner_id text)
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
    set status = 'failed',
        error = 'The Deep Scan runner stopped before returning a result. Retry the scan.',
        completed_at = now(),
        lease_expires_at = null
    where status = 'running'
      and lease_expires_at < now()
    returning extension_id, version
  loop
    update public.extension_versions
    set scan_state = 'failed'
    where extension_id = stale.extension_id
      and version = stale.version
      and scan_state = 'running';
  end loop;

  insert into public.scan_runner_status(id, last_seen_at)
  values ('github-actions', now())
  on conflict(id) do update set last_seen_at = excluded.last_seen_at;

  select * into claimed
  from public.scan_jobs
  where profile = 'deep' and status = 'queued'
  order by created_at asc
  for update skip locked
  limit 1;

  if claimed.id is null then return null; end if;

  update public.scan_jobs
  set status = 'running',
      runner_id = p_runner_id,
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, now()),
      lease_expires_at = now() + interval '30 minutes',
      error = null
  where id = claimed.id
  returning * into claimed;

  update public.extension_versions
  set scan_state = 'running'
  where extension_id = claimed.extension_id and version = claimed.version;

  update public.scan_runner_status
  set last_claimed_at = now()
  where id = 'github-actions';

  return claimed;
end;
$$;

revoke all on function public.claim_next_deep_scan(text) from public, anon, authenticated;
grant execute on function public.claim_next_deep_scan(text) to service_role;

update public.scan_jobs
set status = 'failed',
    error = 'The previous GitHub dispatch path was retired. Retry this Deep Scan.',
    completed_at = now(),
    lease_expires_at = null
where status in ('queued', 'running');

update public.extension_versions as version
set scan_state = 'failed'
where version.scan_state in ('queued', 'running')
  and not exists (
    select 1 from public.scan_jobs as job
    where job.extension_id = version.extension_id
      and job.version = version.version
      and job.status in ('queued', 'running')
  );;
