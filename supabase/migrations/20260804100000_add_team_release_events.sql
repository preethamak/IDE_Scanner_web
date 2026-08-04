create table public.team_release_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  baseline_scan_id uuid references public.scans(id) on delete set null,
  target_scan_id uuid references public.scans(id) on delete set null,
  baseline_version text,
  target_version text not null,
  state text not null check (state in ('release_detected', 'scan_queued', 'scan_running', 'comparison_ready', 'analysis_incomplete', 'analysis_failed', 'superseded')),
  materiality text check (materiality in ('informational', 'review_recommended', 'review_required', 'analysis_unavailable')),
  comparison jsonb not null default '{}'::jsonb,
  error text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, dedupe_key)
);

create index team_release_events_queue on public.team_release_events(team_id, state, created_at desc);
alter table public.team_release_events enable row level security;
create policy "members read team release events" on public.team_release_events
  for select to authenticated using (private.is_team_member(team_id));
grant select on public.team_release_events to authenticated;
