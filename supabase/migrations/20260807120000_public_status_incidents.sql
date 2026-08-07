create table if not exists public.public_status_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  status text not null check (status in ('investigating','identified','monitoring','resolved')),
  impact text not null check (impact in ('minor','major','critical')),
  summary text not null check (char_length(summary) between 1 and 2000),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'resolved' and resolved_at is not null) or status <> 'resolved')
);
alter table public.public_status_incidents enable row level security;
drop policy if exists "public can read status incidents" on public.public_status_incidents;
create policy "public can read status incidents" on public.public_status_incidents for select using (true);
revoke insert, update, delete on public.public_status_incidents from anon, authenticated;
grant select on public.public_status_incidents to anon, authenticated;
create index if not exists public_status_incidents_started_at_idx on public.public_status_incidents (started_at desc);
