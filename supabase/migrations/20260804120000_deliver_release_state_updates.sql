-- A monitored release is a workflow event, not merely a severity alert. It
-- must reach subscribed team channels even before a target scan has severity.
create or replace function public.queue_team_notification_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_notification_deliveries(team_id, alert_id, channel_id)
  select new.team_id, new.id, c.id
  from public.team_notification_channels c
  where c.team_id = new.team_id and c.enabled = true
    and (new.kind = 'release_detected' or public.severity_meets_threshold(coalesce(new.severity, 'INFORMATIONAL'), c.minimum_severity))
  on conflict (alert_id, channel_id) do nothing;
  return new;
end;
$$;

-- Do not create a second generic scan alert for a target that belongs to an
-- already-detected team release. The release state update below is richer and
-- contains its reviewed baseline.
create or replace function public.create_team_scan_monitoring_alert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  watched_team record;
  alert_kind text;
  alert_title text;
  alert_summary text;
begin
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;
  if new.decision = 'block' then
    alert_kind := case when new.verdict = 'malicious' then 'confirmed_threat' else 'review_required' end;
    alert_title := coalesce(new.severity, 'HIGH') || '-severity evidence needs review: ' || new.extension_id || '@' || new.version;
    alert_summary := 'Open the exact artifact report and record the team decision.';
  elsif new.decision = 'incomplete' then
    alert_kind := 'coverage_incomplete'; alert_title := 'Coverage incomplete for ' || new.extension_id || '@' || new.version; alert_summary := 'Required analysis did not complete. This is not an approval.';
  elsif new.severity in ('CRITICAL', 'HIGH') or new.decision = 'review' then
    alert_kind := 'review_required'; alert_title := coalesce(new.severity, 'INFORMATIONAL') || '-severity evidence needs review: ' || new.extension_id || '@' || new.version; alert_summary := 'The completed scan requires context before approval.';
  else
    alert_kind := 'scan_completed'; alert_title := 'New scan completed for ' || new.extension_id || '@' || new.version; alert_summary := 'Open the exact artifact evidence and update the team decision if needed.';
  end if;
  for watched_team in
    select distinct item.team_id from public.team_watchlist_items item
    where item.extension_id = new.extension_id and item.monitoring_state = 'monitoring'
      and not exists (select 1 from public.team_release_events event where event.team_id = item.team_id and event.extension_id = new.extension_id and event.target_version = new.version and event.state in ('release_detected', 'scan_queued', 'scan_running'))
  loop
    insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
    values (watched_team.team_id, new.extension_id, new.version, new.id, alert_kind, new.severity, alert_title, alert_summary, jsonb_build_object('decision', new.decision, 'public_outcome', new.public_outcome, 'coverage_percent', new.coverage_percent, 'scan_purpose', new.scan_purpose), 'scan:' || new.id::text)
    on conflict (team_id, dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;

-- Emit a release-specific state update after the target scan is immutable.
create or replace function public.transition_team_release_event_on_scan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_state text;
  target_materiality text;
  release record;
begin
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;
  target_state := case when new.analysis_status = 'complete' then 'comparison_ready' when new.analysis_status = 'failed' then 'analysis_failed' else 'analysis_incomplete' end;
  target_materiality := case when new.analysis_status <> 'complete' then 'analysis_unavailable' when new.decision = 'block' or new.severity in ('CRITICAL', 'HIGH') then 'review_required' when new.decision = 'review' then 'review_recommended' else 'informational' end;
  for release in
    update public.team_release_events
    set target_scan_id = new.id, state = target_state, materiality = target_materiality,
        error = case when target_state = 'analysis_failed' then coalesce(new.decision_reason, 'Deep Scan failed before a comparison could be produced.') else null end,
        updated_at = now()
    where extension_id = new.extension_id and target_version = new.version and state in ('release_detected', 'scan_queued', 'scan_running')
    returning team_id, extension_id, baseline_version, target_version, target_scan_id, state, materiality
  loop
    insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
    values (release.team_id, release.extension_id, release.target_version, release.target_scan_id, 'release_detected', new.severity,
      'Release analysis ' || replace(release.state, '_', ' ') || ': ' || release.extension_id || '@' || release.target_version,
      case when release.state = 'analysis_incomplete' then 'Analysis is incomplete. This release is not approved.' when release.state = 'analysis_failed' then 'Analysis failed before a comparison could be produced.' else 'Exact release comparison is ready for review.' end,
      jsonb_build_object('release_event', true, 'release_state', release.state, 'baseline_version', release.baseline_version, 'decision', new.decision, 'coverage_percent', new.coverage_percent, 'materiality', release.materiality),
      'release:' || release.extension_id || '@' || release.target_version || ':' || release.state)
    on conflict (team_id, dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
