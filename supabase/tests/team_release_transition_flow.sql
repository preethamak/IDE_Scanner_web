-- Run with the postgres connection. It proves a target Deep Scan changes an
-- existing monitored-release event into an immutable, reviewable queue item.
begin;

insert into auth.users(id) values ('77777777-7777-4777-8777-777777777777');
insert into public.teams(id, name, slug, created_by) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Release flow team', 'release-flow-team', '77777777-7777-4777-8777-777777777777');
insert into public.team_members(team_id, user_id, role) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '77777777-7777-4777-8777-777777777777', 'owner');

insert into public.team_release_events(id, team_id, extension_id, baseline_version, target_version, state, dedupe_key) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'GitHub.copilot', 'test-baseline', 'test-target-complete', 'scan_queued', 'release-flow-complete'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'GitHub.copilot', 'test-baseline', 'test-target-incomplete', 'scan_queued', 'release-flow-incomplete');

insert into public.scans(
  id, extension_id, version, artifact_sha256, profile, schema_version, scanner_version, ruleset_version,
  decision, decision_reason, verdict, severity, coverage_percent, canonical_report, scan_purpose,
  public_outcome, decision_basis, evidence_confidence, provenance_tier, analysis_status
) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd11', 'GitHub.copilot', 'test-target-complete', repeat('c', 64), 'deep', '1', 'test', 'test',
   'allow', 'Complete fixture', 'clean', 'LOW', 100, '{}'::jsonb, 'public_intelligence',
   'clear', 'evidence', 'high', 'verified', 'complete'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd12', 'GitHub.copilot', 'test-target-incomplete', repeat('d', 64), 'deep', '1', 'test', 'test',
   'incomplete', 'Coverage did not complete', 'unknown', 'INFORMATIONAL', 70, '{}'::jsonb, 'public_intelligence',
   'incomplete', 'incomplete', 'none', 'unknown', 'incomplete');

do $$
begin
  if not exists (
    select 1 from public.team_release_events
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
      and target_scan_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd11'
      and state = 'comparison_ready' and materiality = 'informational'
  ) then raise exception 'complete target scan did not make the release comparison ready'; end if;
  if not exists (
    select 1 from public.team_release_events
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd02'
      and target_scan_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd12'
      and state = 'analysis_incomplete' and materiality = 'analysis_unavailable'
  ) then raise exception 'incomplete target scan was presented as an approval'; end if;
  if (select count(*) from public.team_monitoring_alerts where team_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and kind = 'release_detected') <> 2 then
    raise exception 'release state updates did not create an auditable alert for each target';
  end if;
end;
$$;

rollback;
