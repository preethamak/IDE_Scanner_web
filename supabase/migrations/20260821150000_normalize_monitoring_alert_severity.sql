create or replace function public.normalize_monitoring_alert_severity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.severity = 'INFO' then
    new.severity := 'INFORMATIONAL';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_monitoring_alert_severity on public.monitoring_alerts;
create trigger normalize_monitoring_alert_severity
before insert or update of severity on public.monitoring_alerts
for each row execute function public.normalize_monitoring_alert_severity();

drop trigger if exists normalize_team_monitoring_alert_severity on public.team_monitoring_alerts;
create trigger normalize_team_monitoring_alert_severity
before insert or update of severity on public.team_monitoring_alerts
for each row execute function public.normalize_monitoring_alert_severity();

revoke execute on function public.normalize_monitoring_alert_severity() from public, anon, authenticated;
