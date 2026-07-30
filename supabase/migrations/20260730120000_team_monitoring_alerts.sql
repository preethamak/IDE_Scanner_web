create table public.team_monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null,
  scan_id uuid references public.scans(id) on delete set null,
  kind text not null check (kind in ('release_detected', 'scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed', 'decision_due')),
  severity text check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
  state text not null default 'unread' check (state in ('unread', 'read', 'acknowledged', 'dismissed')),
  title text not null check (char_length(title) between 1 and 180),
  summary text not null default '' check (char_length(summary) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz,
  unique(team_id, dedupe_key)
);

create index team_monitoring_alerts_queue on public.team_monitoring_alerts(team_id, state, created_at desc);
alter table public.team_monitoring_alerts enable row level security;
create policy "members read team alerts" on public.team_monitoring_alerts for select to authenticated using (public.is_team_member(team_id));
-- Alert mutation is server mediated so users can only transition state, never
-- change an alert's team, evidence, or delivery metadata.
grant select on public.team_monitoring_alerts to authenticated;

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
  end loop;
  return new;
end;
$$;

drop trigger if exists team_scan_monitoring_alert on public.scans;
create trigger team_scan_monitoring_alert after insert on public.scans for each row execute function public.create_team_scan_monitoring_alert();
revoke all on function public.create_team_scan_monitoring_alert() from public, anon, authenticated;
grant execute on function public.create_team_scan_monitoring_alert() to service_role;
