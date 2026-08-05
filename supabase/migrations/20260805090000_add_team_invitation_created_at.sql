-- Older production projects created invitations before audit timestamps were
-- introduced. The workspace API orders and displays this field, so backfill it
-- safely for both existing and newly-created invitations.
alter table public.team_invitations
  add column if not exists created_at timestamptz not null default now();

create index if not exists team_invitations_team_created_at
  on public.team_invitations(team_id, created_at desc);
