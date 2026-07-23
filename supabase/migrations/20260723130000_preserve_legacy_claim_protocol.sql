-- Keep the pre-build-binding RPC during the deployment compatibility window,
-- but prevent legacy workers from claiming protocol-2 jobs.
create or replace function public.claim_deep_scan_job(
  p_runner_id text,
  p_job_id uuid default null,
  p_github_run_id bigint default null
)
returns public.scan_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed public.scan_jobs;
begin
  if p_runner_id is null or p_runner_id !~ '^[a-zA-Z0-9._:-]{1,120}$' then
    raise exception 'Invalid runner identity';
  end if;

  insert into public.scan_runner_status(id, last_seen_at)
  values ('github-actions', now())
  on conflict(id) do update set last_seen_at = excluded.last_seen_at;

  if p_job_id is not null then
    select * into claimed from public.scan_jobs
    where id = p_job_id and profile = 'deep' and status = 'queued'
      and claim_protocol = 1 and expected_scanner_build is null
    for update skip locked;
  else
    select * into claimed from public.scan_jobs
    where profile = 'deep' and status = 'queued'
      and claim_protocol = 1 and expected_scanner_build is null
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
  values (claimed.id, 'analyzing', 'claimed_legacy', jsonb_build_object(
    'runner_id', p_runner_id,
    'github_run_id', p_github_run_id,
    'claim_protocol', 1
  ));
  update public.extension_versions set scan_state = 'running'
  where extension_id = claimed.extension_id and version = claimed.version;
  update public.scan_runner_status set last_claimed_at = now() where id = 'github-actions';
  return claimed;
end;
$$;

revoke all on function public.claim_deep_scan_job(text,uuid,bigint) from public, anon, authenticated;
grant execute on function public.claim_deep_scan_job(text,uuid,bigint) to service_role;
