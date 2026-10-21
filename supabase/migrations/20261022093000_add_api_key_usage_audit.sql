-- Machine credential usage is an administrative audit signal. It intentionally
-- excludes secrets, bodies, query values, IP addresses, and response content.
create table public.api_key_usage (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  key_id uuid not null references public.api_keys(id) on delete cascade,
  method text not null check (char_length(method) between 1 and 12),
  endpoint text not null check (endpoint like '/%' and char_length(endpoint) <= 240),
  created_at timestamptz not null default now()
);

create index api_key_usage_team_created_idx on public.api_key_usage(team_id, created_at desc);
create index api_key_usage_key_created_idx on public.api_key_usage(key_id, created_at desc);

alter table public.api_key_usage enable row level security;
create policy "admins read api key usage" on public.api_key_usage
  for select to authenticated using (private.can_manage_team(team_id));
revoke all on public.api_key_usage from anon, authenticated;
grant select on public.api_key_usage to authenticated;
