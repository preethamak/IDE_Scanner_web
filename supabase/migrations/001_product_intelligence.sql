create extension if not exists pgcrypto;

create table public.extensions (
  id text primary key,
  name text not null,
  display_name text not null,
  publisher text not null,
  description text not null default '',
  registry text not null check (registry in ('vs-marketplace','openvsx')),
  publisher_verified boolean not null default false,
  installs bigint not null default 0,
  rating numeric not null default 0,
  icon_url text not null default '',
  repository_url text not null default '',
  first_published_at timestamptz,
  last_published_at timestamptz,
  catalog_rank integer,
  updated_at timestamptz not null default now()
);

create table public.extension_versions (
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null,
  registry text not null,
  published_at timestamptz,
  artifact_sha256 text,
  artifact_size bigint,
  download_url text,
  is_latest boolean not null default false,
  is_removed boolean not null default false,
  scan_state text not null default 'not_scanned' check (scan_state in ('not_scanned','queued','running','complete','incomplete','failed')),
  latest_scan_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  primary key (extension_id, version)
);

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null,
  profile text not null check (profile in ('quick','deep')),
  status text not null default 'queued' check (status in ('queued','running','complete','incomplete','failed')),
  requested_by uuid references auth.users(id) on delete set null,
  requester_hash text,
  github_run_id bigint,
  ruleset_version text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create unique index scan_jobs_active_artifact on public.scan_jobs(extension_id, version, profile)
where status in ('queued','running');

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid unique references public.scan_jobs(id) on delete set null,
  extension_id text not null,
  version text not null,
  artifact_sha256 text not null,
  profile text not null,
  schema_version text not null,
  scanner_version text not null,
  ruleset_version text not null,
  decision text not null check (decision in ('allow','review','block','incomplete')),
  decision_reason text not null,
  verdict text not null,
  severity text not null,
  risk_score integer not null default 0,
  malware_score integer not null default 0,
  coverage_percent integer not null default 0,
  provider_coverage jsonb not null default '{}'::jsonb,
  security_dimensions jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  artifact_inventory jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,
  baseline_diff jsonb not null default '{}'::jsonb,
  canonical_report jsonb not null,
  scanned_at timestamptz not null default now(),
  unique(extension_id, version, artifact_sha256, ruleset_version)
);

alter table public.extension_versions add constraint extension_versions_latest_scan_fk
foreign key (latest_scan_id) references public.scans(id) on delete set null;

create table public.findings (
  id text not null,
  scan_id uuid not null references public.scans(id) on delete cascade,
  rule_id text not null,
  category text not null,
  severity text not null,
  confidence numeric not null default 0,
  evidence_class text not null,
  actionability text not null,
  summary text not null,
  recommendation text not null default '',
  file_refs jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  primary key (scan_id, id)
);

create table public.artifact_files (
  scan_id uuid not null references public.scans(id) on delete cascade,
  path text not null,
  sha256 text not null,
  size_bytes bigint not null default 0,
  kind text not null default 'file',
  target text,
  primary key (scan_id, path)
);

create table public.dependencies (
  scan_id uuid not null references public.scans(id) on delete cascade,
  name text not null,
  version text not null,
  ecosystem text not null default 'npm',
  relationship text not null check (relationship in ('direct','transitive')),
  advisories jsonb not null default '[]'::jsonb,
  primary key (scan_id, ecosystem, name, version)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My extensions',
  created_at timestamptz not null default now()
);

create table public.watchlist_items (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watchlist_id, extension_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  primary key (team_id, user_id)
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  token_hash text unique not null,
  role text not null default 'member' check (role in ('owner','member')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id)
);

create table public.team_watchlist_items (
  team_id uuid not null references public.teams(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (team_id, extension_id)
);

create table public.finding_triage (
  team_id uuid not null references public.teams(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  finding_id text not null,
  status text not null check (status in ('open','reviewing','accepted_risk','resolved','false_positive')),
  assigned_to uuid references auth.users(id) on delete set null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (team_id, scan_id, finding_id),
  foreign key (scan_id, finding_id) references public.findings(scan_id, id) on delete cascade
);

create table public.finding_comments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  scan_id uuid not null,
  finding_id text not null,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (team_id, scan_id, finding_id) references public.finding_triage(team_id, scan_id, finding_id) on delete cascade
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  insert into public.watchlists(owner_id, name) values(new.id, 'My extensions');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_team_member(target_team uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.team_members where team_id = target_team and user_id = auth.uid()) $$;

alter table public.extensions enable row level security;
alter table public.extension_versions enable row level security;
alter table public.scan_jobs enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;
alter table public.artifact_files enable row level security;
alter table public.dependencies enable row level security;
alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.team_watchlist_items enable row level security;
alter table public.finding_triage enable row level security;
alter table public.finding_comments enable row level security;

create policy "public catalog" on public.extensions for select using (true);
create policy "public versions" on public.extension_versions for select using (true);
create policy "public scans" on public.scans for select using (true);
create policy "public findings" on public.findings for select using (true);
create policy "public files" on public.artifact_files for select using (true);
create policy "public dependencies" on public.dependencies for select using (true);
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own watchlists" on public.watchlists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own watchlist items" on public.watchlist_items for all using (exists(select 1 from public.watchlists w where w.id = watchlist_id and w.owner_id = auth.uid())) with check (exists(select 1 from public.watchlists w where w.id = watchlist_id and w.owner_id = auth.uid()));
create policy "team access" on public.teams for select using (public.is_team_member(id));
create policy "team members access" on public.team_members for select using (public.is_team_member(team_id));
create policy "team invitations access" on public.team_invitations for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy "team watchlist access" on public.team_watchlist_items for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy "team triage access" on public.finding_triage for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy "team comments access" on public.finding_comments for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create index extensions_catalog_rank on public.extensions(catalog_rank nulls last);
create index versions_published on public.extension_versions(extension_id, published_at desc);
create index scans_extension_version on public.scans(extension_id, version, scanned_at desc);
create index findings_scan_action on public.findings(scan_id, actionability, severity);
