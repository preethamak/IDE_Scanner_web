-- A monitored extension needs an auditable loop: a new published release is
-- noticed, its scan outcome is recorded, and the owner can triage the result.
-- These records intentionally say "review" unless the scanner produced an
-- authoritative block decision; a severity alone is never marketed as a CVE.
create table public.monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null,
  scan_id uuid references public.scans(id) on delete set null,
  kind text not null check (kind in ('release_detected', 'scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed')),
  severity text check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
  state text not null default 'unread' check (state in ('unread', 'read', 'acknowledged', 'dismissed')),
  title text not null check (char_length(title) between 1 and 180),
  summary text not null default '' check (char_length(summary) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz,
  unique(owner_id, dedupe_key)
);
create table public.monitoring_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_digest text not null default 'off' check (email_digest in ('off', 'daily', 'weekly')),
  minimum_severity text not null default 'MEDIUM' check (minimum_severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
  release_alerts boolean not null default true,
  scan_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index monitoring_alerts_owner_state_created on public.monitoring_alerts(owner_id, state, created_at desc);
create index monitoring_alerts_extension_version on public.monitoring_alerts(extension_id, version, created_at desc);
alter table public.monitoring_alerts enable row level security;
alter table public.monitoring_preferences enable row level security;
create policy "own monitoring alerts" on public.monitoring_alerts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own monitoring preferences" on public.monitoring_preferences
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on public.monitoring_alerts to authenticated;
grant select, insert, update, delete on public.monitoring_preferences to authenticated;
create or replace function public.create_scan_monitoring_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watcher record;
  alert_kind text;
  alert_title text;
  alert_summary text;
begin
  -- Development fixtures and benchmark scans must never create customer noise.
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;

  if new.decision = 'block' then
    alert_kind := 'confirmed_threat';
    alert_title := 'Confirmed threat evidence blocked ' || new.extension_id || '@' || new.version;
    alert_summary := 'The completed scan produced a block decision. Open the exact artifact report before taking remediation action.';
  elsif new.decision = 'incomplete' then
    alert_kind := 'coverage_incomplete';
    alert_title := 'Coverage incomplete for ' || new.extension_id || '@' || new.version;
    alert_summary := 'The scanner could not complete required analysis. This is not a clean result.';
  elsif new.severity in ('CRITICAL', 'HIGH') then
    alert_kind := 'review_required';
    alert_title := new.severity || '-severity evidence needs review: ' || new.extension_id || '@' || new.version;
    alert_summary := 'The completed scan requires human context. This is review evidence, not a public vulnerability claim.';
  else
    alert_kind := 'scan_completed';
    alert_title := 'New scan completed for ' || new.extension_id || '@' || new.version;
    alert_summary := 'Review the exact artifact evidence and operational decision.';
  end if;

  for watcher in
    select distinct w.owner_id
    from public.watchlist_items i
    join public.watchlists w on w.id = i.watchlist_id
    join public.monitoring_preferences p on p.owner_id = w.owner_id
    where i.extension_id = new.extension_id
      and p.in_app_enabled = true
      and p.scan_alerts = true
  loop
    insert into public.monitoring_alerts(owner_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
    values (
      watcher.owner_id, new.extension_id, new.version, new.id, alert_kind, new.severity, alert_title, alert_summary,
      jsonb_build_object('decision', new.decision, 'coverage_percent', new.coverage_percent, 'scan_purpose', new.scan_purpose),
      'scan:' || new.id::text
    ) on conflict (owner_id, dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
drop trigger if exists scan_monitoring_alert on public.scans;
create trigger scan_monitoring_alert
  after insert on public.scans
  for each row execute function public.create_scan_monitoring_alert();
create or replace function public.initialize_monitoring_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.monitoring_preferences(owner_id) values (new.id) on conflict (owner_id) do nothing;
  return new;
end;
$$;
drop trigger if exists monitoring_preferences_on_new_user on auth.users;
create trigger monitoring_preferences_on_new_user
  after insert on auth.users
  for each row execute function public.initialize_monitoring_preferences();
insert into public.monitoring_preferences(owner_id)
select id from auth.users on conflict (owner_id) do nothing;
