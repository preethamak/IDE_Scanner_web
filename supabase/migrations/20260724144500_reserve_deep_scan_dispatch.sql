create or replace function public.reserve_deep_scan_dispatch(
  p_job_id uuid,
  p_minimum_interval_seconds integer default 120,
  p_max_attempts integer default 4
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved boolean := false;
begin
  update public.scan_jobs
  set lifecycle_stage = 'dispatching',
      dispatch_requested_at = now(),
      dispatch_count = dispatch_count + 1,
      updated_at = now(),
      last_event_at = now()
  where id = p_job_id
    and status = 'queued'
    and github_run_id is null
    and dispatch_count < greatest(coalesce(p_max_attempts, 4), 1)
    and (
      dispatch_requested_at is null
      or dispatch_requested_at <= now() - make_interval(secs => greatest(coalesce(p_minimum_interval_seconds, 120), 0))
    )
  returning true into reserved;

  return coalesce(reserved, false);
end;
$$;

revoke all on function public.reserve_deep_scan_dispatch(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_deep_scan_dispatch(uuid, integer, integer) to service_role;
