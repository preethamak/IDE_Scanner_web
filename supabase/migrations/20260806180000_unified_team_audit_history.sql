create table if not exists public.team_audit_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  object_type text not null,
  object_id text not null,
  extension_id text,
  version text,
  previous_state jsonb,
  resulting_state jsonb,
  rationale text,
  risk_level text,
  created_at timestamptz not null default now()
);

create index if not exists team_audit_events_history
  on public.team_audit_events(team_id, created_at desc);
create index if not exists team_audit_events_extension
  on public.team_audit_events(team_id, extension_id, created_at desc)
  where extension_id is not null;

alter table public.team_audit_events enable row level security;
drop policy if exists "members read team audit events" on public.team_audit_events;
create policy "members read team audit events" on public.team_audit_events
  for select to authenticated using (private.is_team_member(team_id));
revoke all on public.team_audit_events from public, anon, authenticated;
grant select on public.team_audit_events to authenticated;

create or replace function private.capture_team_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  before_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  source_row jsonb := coalesce(after_row, before_row, '{}'::jsonb);
  target_team uuid := nullif(source_row ->> 'team_id', '')::uuid;
  safe_before jsonb := case when before_row is null then null else before_row - 'target_encrypted' end;
  safe_after jsonb := case when after_row is null then null else after_row - 'target_encrypted' end;
begin
  if target_team is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  insert into public.team_audit_events(
    team_id, actor_id, action, object_type, object_id, extension_id, version,
    previous_state, resulting_state, rationale, risk_level
  ) values (
    target_team,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(source_row ->> 'id', source_row ->> 'user_id', source_row ->> 'extension_id', 'workspace'),
    source_row ->> 'extension_id',
    coalesce(source_row ->> 'version', source_row ->> 'baseline_version'),
    safe_before,
    safe_after,
    coalesce(source_row ->> 'rationale', source_row ->> 'title'),
    source_row ->> 'severity'
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.capture_team_audit_event() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_members',
    'team_invitations',
    'team_watchlist_items',
    'team_notification_channels',
    'team_monitoring_preferences'
  ] loop
    execute format('drop trigger if exists capture_team_audit_event on public.%I', table_name);
    execute format(
      'create trigger capture_team_audit_event after insert or update or delete on public.%I for each row execute function private.capture_team_audit_event()',
      table_name
    );
  end loop;
end;
$$;

drop trigger if exists capture_team_alert_state_audit on public.team_monitoring_alerts;
create trigger capture_team_alert_state_audit
after update of state on public.team_monitoring_alerts
for each row when (old.state is distinct from new.state)
execute function private.capture_team_audit_event();
