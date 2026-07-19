-- Keep stale-job reconciliation aligned with the lifecycle observability
-- columns introduced earlier in this migration sequence.
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
        lifecycle_stage = 'failed',
        error = case
          when status = 'running'
            then 'The Deep Scan runner stopped before returning a result. Retry the scan.'
          else 'No Deep Scan runner picked up this job. Retry the scan.'
        end,
        completed_at = now(),
        lease_expires_at = null,
        updated_at = now(),
        last_event_at = now()
    where (status = 'running' and lease_expires_at is not null and lease_expires_at < now())
       or (status = 'queued' and created_at < now() - grace)
    returning id, extension_id, version
  loop
    reconciled := reconciled + 1;
    insert into public.scan_job_events(job_id, stage, event_type, detail)
    values (
      stale.id,
      'failed',
      'stale_reconciled',
      jsonb_build_object('extension_id', stale.extension_id, 'version', stale.version)
    );
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
