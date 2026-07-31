alter table public.team_monitoring_alerts
  add column dismissal_reason text;

alter table public.team_monitoring_alerts
  add constraint team_monitoring_alerts_dismissal_reason_check
  check (
    state <> 'dismissed'
    or char_length(trim(coalesce(dismissal_reason, ''))) between 1 and 400
  );
