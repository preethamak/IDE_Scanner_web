create table public.team_notification_channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  kind text not null check (kind in ('slack_webhook')),
  label text not null check (char_length(label) between 1 and 80),
  target_encrypted text not null,
  enabled boolean not null default true,
  minimum_severity text not null default 'MEDIUM' check (minimum_severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  alert_id uuid not null references public.team_monitoring_alerts(id) on delete cascade,
  channel_id uuid not null references public.team_notification_channels(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(alert_id, channel_id)
);

create index team_notification_deliveries_dispatch on public.team_notification_deliveries(status, next_attempt_at) where status in ('pending', 'failed');
alter table public.team_notification_channels enable row level security;
alter table public.team_notification_deliveries enable row level security;
create policy "members read team channel metadata" on public.team_notification_channels for select to authenticated using (public.is_team_member(team_id));
create policy "members read team deliveries" on public.team_notification_deliveries for select to authenticated using (public.is_team_member(team_id));
grant select on public.team_notification_channels, public.team_notification_deliveries to authenticated;

create or replace function public.queue_team_notification_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_notification_deliveries(team_id, alert_id, channel_id)
  select new.team_id, new.id, c.id
  from public.team_notification_channels c
  where c.team_id = new.team_id and c.enabled = true
    and public.severity_meets_threshold(coalesce(new.severity, 'INFORMATIONAL'), c.minimum_severity)
  on conflict (alert_id, channel_id) do nothing;
  return new;
end;
$$;

drop trigger if exists queue_team_alert_notifications on public.team_monitoring_alerts;
create trigger queue_team_alert_notifications after insert on public.team_monitoring_alerts for each row execute function public.queue_team_notification_delivery();
revoke all on function public.queue_team_notification_delivery() from public, anon, authenticated;
grant execute on function public.queue_team_notification_delivery() to service_role;
