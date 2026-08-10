create table if not exists public.workspace_subscriptions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free','team','business')),
  status text not null default 'free' check (status in ('free','trialing','active','past_due','canceled','incomplete','unpaid')),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  metric text not null check (metric in ('monitored_extensions','team_members','notification_channels','audit_export')),
  quantity integer not null,
  idempotency_key text not null,
  recorded_at timestamptz not null default now(),
  unique (team_id, idempotency_key)
);

create table if not exists public.billing_webhook_events (
  provider_event_id text primary key,
  event_type text not null,
  provider_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create index if not exists workspace_usage_ledger_team_recorded_idx on public.workspace_usage_ledger(team_id, recorded_at desc);
alter table public.workspace_subscriptions enable row level security;
alter table public.workspace_usage_ledger enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy "workspace members read safe subscription state" on public.workspace_subscriptions
for select to authenticated using (public.is_team_member(team_id));
create policy "workspace members read usage" on public.workspace_usage_ledger
for select to authenticated using (public.is_team_member(team_id));

revoke all on public.billing_webhook_events from anon, authenticated;
revoke insert, update, delete on public.workspace_subscriptions from anon, authenticated;
revoke insert, update, delete on public.workspace_usage_ledger from anon, authenticated;

create or replace function public.initialize_workspace_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_subscriptions(team_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_workspace_subscription() from public, anon, authenticated;

drop trigger if exists initialize_workspace_subscription on public.teams;
create trigger initialize_workspace_subscription after insert on public.teams
for each row execute function public.initialize_workspace_subscription();
insert into public.workspace_subscriptions(team_id)
select id from public.teams on conflict do nothing;

comment on table public.workspace_subscriptions is 'Provider-reconciled workspace billing state. Service-role writes only.';
comment on table public.billing_webhook_events is 'Verified provider event ids used to make webhook delivery idempotent.';
