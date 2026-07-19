create table public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
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
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid not null references public.monitoring_alerts(id) on delete cascade,
  channel_id uuid not null references public.notification_channels(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(alert_id, channel_id)
);
create index notification_deliveries_dispatch on public.notification_deliveries(status, next_attempt_at) where status in ('pending', 'failed');
create index notification_deliveries_owner_created on public.notification_deliveries(owner_id, created_at desc);
create index notification_channels_owner on public.notification_channels(owner_id, enabled);
alter table public.notification_channels enable row level security;
alter table public.notification_deliveries enable row level security;
-- Targets are encrypted by the application and intentionally unavailable to
-- browser clients. Authenticated users manage them through authenticated API
-- routes that return metadata only; the service role performs delivery.
revoke all on public.notification_channels from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;
create or replace function public.severity_meets_threshold(value text, threshold text)
returns boolean language sql immutable as $$
  select case value
    when 'CRITICAL' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end
  >= case threshold
    when 'CRITICAL' then 5 when 'HIGH' then 4 when 'MEDIUM' then 3 when 'LOW' then 2 else 1 end;
$$;
create or replace function public.queue_notification_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_deliveries(owner_id, alert_id, channel_id)
  select new.owner_id, new.id, c.id
  from public.notification_channels c
  where c.owner_id = new.owner_id and c.enabled = true
    and public.severity_meets_threshold(coalesce(new.severity, 'INFORMATIONAL'), c.minimum_severity)
  on conflict (alert_id, channel_id) do nothing;
  return new;
end;
$$;
drop trigger if exists queue_alert_notifications on public.monitoring_alerts;
create trigger queue_alert_notifications after insert on public.monitoring_alerts
for each row execute function public.queue_notification_delivery();
create or replace function public.seed_channel_deliveries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.enabled then
    insert into public.notification_deliveries(owner_id, alert_id, channel_id)
    select new.owner_id, a.id, new.id
    from public.monitoring_alerts a
    where a.owner_id = new.owner_id and a.state in ('unread', 'read')
      and public.severity_meets_threshold(coalesce(a.severity, 'INFORMATIONAL'), new.minimum_severity)
    on conflict (alert_id, channel_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists seed_new_notification_channel on public.notification_channels;
create trigger seed_new_notification_channel after insert on public.notification_channels
for each row execute function public.seed_channel_deliveries();
