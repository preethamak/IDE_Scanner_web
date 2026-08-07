alter table public.billing_webhook_events
  add column if not exists status text not null default 'processed'
    check (status in ('processing','processed','failed')),
  add column if not exists attempts integer not null default 1,
  add column if not exists last_error text;

alter table public.billing_webhook_events
  alter column processed_at drop not null,
  alter column processed_at drop default;

create or replace function public.claim_billing_webhook_event(
  event_id text,
  event_name text,
  event_created_at timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
declare claimed boolean := false;
begin
  insert into public.billing_webhook_events(
    provider_event_id, event_type, provider_created_at, status, attempts
  ) values (event_id, event_name, event_created_at, 'processing', 1)
  on conflict (provider_event_id) do update
    set status = 'processing', attempts = billing_webhook_events.attempts + 1,
        last_error = null
    where billing_webhook_events.status = 'failed'
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.finish_billing_webhook_event(
  event_id text,
  succeeded boolean,
  failure_message text default null
) returns void
language sql security definer set search_path = public as $$
  update public.billing_webhook_events
  set status = case when succeeded then 'processed' else 'failed' end,
      processed_at = case when succeeded then now() else null end,
      last_error = case when succeeded then null else left(failure_message, 500) end
  where provider_event_id = event_id and status = 'processing';
$$;

revoke all on function public.claim_billing_webhook_event(text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.finish_billing_webhook_event(text,boolean,text) from public, anon, authenticated;
grant execute on function public.claim_billing_webhook_event(text,text,timestamptz) to service_role;
grant execute on function public.finish_billing_webhook_event(text,boolean,text) to service_role;

create or replace function public.enforce_workspace_resource_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  selected_plan text;
  selected_status text;
  selected_trial_end timestamptz;
  resource_count integer;
  resource_limit integer;
begin
  insert into public.workspace_subscriptions(team_id) values (new.team_id)
    on conflict do nothing;
  select plan_id, status, trial_ends_at
    into selected_plan, selected_status, selected_trial_end
    from public.workspace_subscriptions where team_id = new.team_id for update;
  if selected_status not in ('active','trialing')
     or (selected_status = 'trialing' and (selected_trial_end is null or selected_trial_end <= now())) then
    selected_plan := 'free';
  end if;
  if selected_plan = 'business' then return new; end if;

  if tg_table_name = 'team_watchlist_items' then
    resource_limit := case when selected_plan = 'team' then 50 else 3 end;
    select count(*) into resource_count from public.team_watchlist_items where team_id = new.team_id;
  elsif tg_table_name = 'team_members' then
    resource_limit := case when selected_plan = 'team' then 15 else 2 end;
    select count(*) into resource_count from public.team_members where team_id = new.team_id;
  elsif tg_table_name = 'team_notification_channels' then
    resource_limit := case when selected_plan = 'team' then 5 else 1 end;
    select count(*) into resource_count from public.team_notification_channels where team_id = new.team_id;
  else
    raise exception 'Unsupported entitlement resource';
  end if;
  if resource_count >= resource_limit then
    raise exception using errcode = 'P0001', message = 'WORKSPACE_PLAN_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_workspace_resource_limit() from public, anon, authenticated;
drop trigger if exists enforce_watchlist_plan_limit on public.team_watchlist_items;
create trigger enforce_watchlist_plan_limit before insert on public.team_watchlist_items
for each row execute function public.enforce_workspace_resource_limit();
drop trigger if exists enforce_member_plan_limit on public.team_members;
create trigger enforce_member_plan_limit before insert on public.team_members
for each row execute function public.enforce_workspace_resource_limit();
drop trigger if exists enforce_notification_channel_plan_limit on public.team_notification_channels;
create trigger enforce_notification_channel_plan_limit before insert on public.team_notification_channels
for each row execute function public.enforce_workspace_resource_limit();

comment on function public.enforce_workspace_resource_limit() is
  'Final concurrency-safe enforcement for plan limits. Values mirror lib/plans.ts and must change in the same migration.';
