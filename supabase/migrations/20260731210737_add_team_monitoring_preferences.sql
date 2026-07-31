create table public.team_monitoring_preferences (
  team_id uuid primary key references public.teams(id) on delete cascade,
  release_alerts boolean not null default true,
  scan_alerts boolean not null default true,
  decision_alerts boolean not null default true,
  high_evidence_alerts boolean not null default true,
  provenance_alerts boolean not null default true,
  coverage_alerts boolean not null default true,
  due_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.team_monitoring_preferences enable row level security;
create policy "members read team monitoring preferences" on public.team_monitoring_preferences
  for select to authenticated using (private.is_team_member(team_id));
grant select on public.team_monitoring_preferences to authenticated;
