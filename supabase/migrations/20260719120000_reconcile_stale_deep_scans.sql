-- A Deep Scan job only leaves a non-terminal state when the signed worker
-- callback lands and writes `complete`/`failed`. If that callback never
-- arrives (dispatch lost, GitHub schedule delayed, callback secret mismatch,
-- runner crash) the job is stranded and the UI polls "Analyzing" forever with
-- no report and no error. This function is the single source of truth that
-- forces every stranded job to a terminal state so the poller always resolves.
--
--   * running jobs whose lease has expired  -> the claiming runner died mid-scan
--   * queued jobs older than the grace window -> no worker ever claimed the job
--     (the */5 schedule plus dispatch means a real claim happens within minutes;
--      p_queue_grace_minutes is generous to avoid failing a job a slow runner is
--      about to pick up).
--
-- It is safe to call from anywhere and as often as desired: it only touches
-- rows that are already past their deadline, and `for update skip locked`
-- prevents it from racing an in-flight claim.
create or replace function public.reconcile_stale_deep_scans(p_queue_grace_minutes integer default 20)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  grace interval := make_interval(mins => greatest(coalesce(p_queue_grace_minutes, 20), 1));
  stale record;
  reconciled integer := 0;
begin
  for stale in
    update public.scan_jobs
    set status = 'failed',
        error = case
          when status = 'running'
            then 'The Deep Scan runner stopped before returning a result. Retry the scan.'
          else 'No Deep Scan runner picked up this job. Retry the scan.'
        end,
        completed_at = now(),
        lease_expires_at = null
    where (status = 'running' and lease_expires_at is not null and lease_expires_at < now())
       or (status = 'queued' and created_at < now() - grace)
    returning extension_id, version
  loop
    reconciled := reconciled + 1;
    update public.extension_versions
    set scan_state = 'failed'
    where extension_id = stale.extension_id
      and version = stale.version
      and scan_state in ('queued', 'running');
  end loop;

  return reconciled;
end;
$$;

revoke all on function public.reconcile_stale_deep_scans(integer) from public, anon, authenticated;
grant execute on function public.reconcile_stale_deep_scans(integer) to service_role;

-- Fold the same reconciliation into the claim path so every scheduled worker
-- invocation (there is one at least every 5 minutes, for free) sweeps stranded
-- queued jobs too, not only running jobs with an expired lease.
create or replace function public.claim_next_deep_scan(p_runner_id text)
returns public.scan_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.scan_jobs;
begin
  if p_runner_id is null or p_runner_id !~ '^[a-zA-Z0-9._:-]{1,120}$' then
    raise exception 'Invalid runner identity';
  end if;

  perform public.reconcile_stale_deep_scans();

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
