-- A completed target scan resolves exactly the monitored release event that
-- selected this extension/version. Incomplete and failed analysis remain
-- explicit non-approval terminal states.
create or replace function public.transition_team_release_event_on_scan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_state text;
  target_materiality text;
begin
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;
  target_state := case
    when new.analysis_status = 'complete' then 'comparison_ready'
    when new.analysis_status = 'failed' then 'analysis_failed'
    else 'analysis_incomplete'
  end;
  target_materiality := case
    when new.analysis_status <> 'complete' then 'analysis_unavailable'
    when new.decision = 'block' or new.severity in ('CRITICAL', 'HIGH') then 'review_required'
    when new.decision = 'review' then 'review_recommended'
    else 'informational'
  end;
  update public.team_release_events
  set target_scan_id = new.id,
      state = target_state,
      materiality = target_materiality,
      error = case when target_state = 'analysis_failed' then coalesce(new.decision_reason, 'Deep Scan failed before a comparison could be produced.') else null end,
      updated_at = now()
  where extension_id = new.extension_id
    and target_version = new.version
    and state in ('release_detected', 'scan_queued', 'scan_running');
  return new;
end;
$$;

drop trigger if exists transition_team_release_event_on_scan on public.scans;
create trigger transition_team_release_event_on_scan
after insert on public.scans
for each row execute function public.transition_team_release_event_on_scan();

revoke all on function public.transition_team_release_event_on_scan() from public, anon, authenticated;
grant execute on function public.transition_team_release_event_on_scan() to service_role;
