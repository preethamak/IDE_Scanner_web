alter table public.team_monitoring_alerts
  drop constraint if exists team_monitoring_alerts_kind_check;

alter table public.team_monitoring_alerts
  add constraint team_monitoring_alerts_kind_check
  check (kind in (
    'release_detected', 'scan_completed', 'review_required', 'confirmed_threat',
    'coverage_incomplete', 'scan_failed', 'decision_due', 'decision_changed',
    'provenance_changed', 'coverage_regressed'
  ));
