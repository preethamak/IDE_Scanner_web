alter table public.profiles
  add column if not exists role text check (role in ('developer','security','engineering_leader')),
  add column if not exists primary_ide text check (primary_ide in ('vscode','cursor','windsurf','vscodium','other')),
  add column if not exists use_case text check (use_case in ('personal','team')),
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  name text not null check (name in ('catalog_search','extension_view','scan_requested','scan_completed','account_created','watch_added','team_created','design_partner_submitted')),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.design_partner_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  work_email text not null,
  company text not null,
  team_size text not null,
  current_process text not null,
  extension_count text not null,
  status text not null default 'new' check (status in ('new','contacted','qualified','closed')),
  created_at timestamptz not null default now()
);

alter table public.product_events enable row level security;
alter table public.design_partner_leads enable row level security;
create policy "own events readable" on public.product_events for select using (user_id = auth.uid());
create policy "own design partner leads" on public.design_partner_leads for select using (user_id = auth.uid());

create index if not exists product_events_name_created on public.product_events(name, created_at desc);
create index if not exists design_partner_leads_created on public.design_partner_leads(created_at desc);
