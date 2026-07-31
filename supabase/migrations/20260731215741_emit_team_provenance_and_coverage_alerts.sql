create or replace function public.create_team_scan_monitoring_alert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  watched_team record;
  prior_scan record;
  alert_kind text;
  alert_title text;
  alert_summary text;
begin
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;
  select coverage_percent, provenance_tier
  into prior_scan
  from public.scans
  where extension_id = new.extension_id and id <> new.id and analysis_status = 'complete'
  order by scanned_at desc, id desc
  limit 1;

  if new.decision = 'block' then
    alert_kind := case when new.verdict = 'malicious' then 'confirmed_threat' else 'review_required' end;
    alert_title := coalesce(new.severity, 'HIGH') || '-severity evidence needs review: ' || new.extension_id || '@' || new.version;
    alert_summary := 'Open the exact artifact report and record the team decision.';
  elsif new.decision = 'incomplete' then
    alert_kind := 'coverage_incomplete';
    alert_title := 'Coverage incomplete for ' || new.extension_id || '@' || new.version;
    alert_summary := 'Required analysis did not complete. This is not an approval.';
  elsif new.severity in ('CRITICAL', 'HIGH') or new.decision = 'review' then
    alert_kind := 'review_required';
    alert_title := coalesce(new.severity, 'INFORMATIONAL') || '-severity evidence needs review: ' || new.extension_id || '@' || new.version;
    alert_summary := 'The completed scan requires context before approval.';
  else
    alert_kind := 'scan_completed';
    alert_title := 'New scan completed for ' || new.extension_id || '@' || new.version;
    alert_summary := 'Open the exact artifact evidence and update the team decision if needed.';
  end if;

  for watched_team in select distinct team_id from public.team_watchlist_items where extension_id = new.extension_id loop
    insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
    values (watched_team.team_id, new.extension_id, new.version, new.id, alert_kind, new.severity, alert_title, alert_summary,
      jsonb_build_object('decision', new.decision, 'public_outcome', new.public_outcome, 'coverage_percent', new.coverage_percent, 'scan_purpose', new.scan_purpose),
      'scan:' || new.id::text)
    on conflict (team_id, dedupe_key) do nothing;

    if prior_scan is not null and prior_scan.provenance_tier is distinct from new.provenance_tier then
      insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
      values (watched_team.team_id, new.extension_id, new.version, new.id, 'provenance_changed', new.severity,
        'Provenance changed for ' || new.extension_id || '@' || new.version,
        'The artifact provenance tier differs from the prior completed scan; review the exact report before approval.',
        jsonb_build_object('previous_provenance_tier', prior_scan.provenance_tier, 'provenance_tier', new.provenance_tier, 'decision', new.decision, 'coverage_percent', new.coverage_percent),
        'provenance:' || new.id::text)
      on conflict (team_id, dedupe_key) do nothing;
    end if;
    if prior_scan is not null and prior_scan.coverage_percent > new.coverage_percent then
      insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
      values (watched_team.team_id, new.extension_id, new.version, new.id, 'coverage_regressed', new.severity,
        'Coverage regressed for ' || new.extension_id || '@' || new.version,
        'Required analyzer coverage is lower than the prior completed scan; this is not an approval.',
        jsonb_build_object('previous_coverage_percent', prior_scan.coverage_percent, 'coverage_percent', new.coverage_percent, 'decision', new.decision),
        'coverage:' || new.id::text)
      on conflict (team_id, dedupe_key) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.create_team_scan_monitoring_alert() from public, anon, authenticated;
grant execute on function public.create_team_scan_monitoring_alert() to service_role;
