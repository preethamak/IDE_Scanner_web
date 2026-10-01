-- Exact artifact approvals and recall records for enterprise extension control.
-- The application writes these through the authenticated server boundary so a
-- browser can never approve an identity that was not backed by a completed scan.
create table public.team_artifact_trust_records (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null check (char_length(version) between 1 and 120),
  registry text not null default 'unknown' check (registry in ('vs-marketplace', 'openvsx', 'unknown')),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-fA-F]{64}$'),
  scan_id uuid references public.scans(id) on delete set null,
  status text not null default 'approved' check (status in ('approved', 'revoked')),
  rationale text not null check (char_length(rationale) between 1 and 4000),
  capability_snapshot jsonb not null default '{}'::jsonb,
  capability_delta jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  unique(team_id, artifact_sha256)
);

create index team_artifact_trust_team_extension_idx
  on public.team_artifact_trust_records(team_id, lower(extension_id), created_at desc);
create index team_artifact_trust_active_idx
  on public.team_artifact_trust_records(team_id, status, created_at desc);

create table public.team_recall_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  trust_record_id uuid references public.team_artifact_trust_records(id) on delete set null,
  extension_id text not null,
  version text not null,
  registry text not null default 'unknown' check (registry in ('vs-marketplace', 'openvsx', 'unknown')),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-fA-F]{64}$'),
  reason text not null check (char_length(reason) between 1 and 4000),
  state text not null default 'open' check (state in ('open', 'acknowledged', 'closed')),
  affected_installations jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  closed_at timestamptz
);

create index team_recall_events_team_state_idx
  on public.team_recall_events(team_id, state, created_at desc);
create index team_recall_events_artifact_idx
  on public.team_recall_events(team_id, artifact_sha256);

alter table public.team_artifact_trust_records enable row level security;
alter table public.team_recall_events enable row level security;

create policy "members read artifact trust records"
  on public.team_artifact_trust_records for select to authenticated
  using (private.is_team_member(team_id));
create policy "members read recall events"
  on public.team_recall_events for select to authenticated
  using (private.is_team_member(team_id));

revoke all on table public.team_artifact_trust_records, public.team_recall_events from anon, authenticated;
grant select on table public.team_artifact_trust_records, public.team_recall_events to authenticated;

drop trigger if exists capture_team_artifact_trust_audit on public.team_artifact_trust_records;
create trigger capture_team_artifact_trust_audit
after insert or update or delete on public.team_artifact_trust_records
for each row execute function private.capture_team_audit_event();

drop trigger if exists capture_team_recall_audit on public.team_recall_events;
create trigger capture_team_recall_audit
after insert or update or delete on public.team_recall_events
for each row execute function private.capture_team_audit_event();
