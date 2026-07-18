-- Interactive Deep Scans must not wait behind catalog backfill work. The
-- worker still claims one job atomically, but it serves authenticated requests
-- before background jobs and preserves FIFO ordering within each class.
create index if not exists scan_jobs_deep_claim_priority
  on public.scan_jobs (created_at asc)
  where profile = 'deep' and status = 'queued' and requested_by is not null;

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
  order by (requested_by is null) asc, created_at asc
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
