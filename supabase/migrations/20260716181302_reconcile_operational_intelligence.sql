-- Reconcile the production schema with the deployed operational-intelligence
-- contract. Historical migrations were applied under timestamped identifiers,
-- so this migration is intentionally additive and idempotent.
alter table public.extension_versions
  add column if not exists discovered_at timestamptz,
  add column if not exists last_seen_at timestamptz;
update public.extension_versions
set discovered_at = coalesce(discovered_at, published_at, now()),
    last_seen_at = coalesce(last_seen_at, published_at, now())
where discovered_at is null or last_seen_at is null;
alter table public.scan_jobs
  add column if not exists scan_purpose text not null default 'public_intelligence';
alter table public.scans
  add column if not exists scan_purpose text not null default 'public_intelligence';
do $$ begin
  alter table public.scan_jobs add constraint scan_jobs_purpose_check
    check (scan_purpose in ('public_intelligence','user_request','benchmark','development'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.scans add constraint scans_purpose_check
    check (scan_purpose in ('public_intelligence','user_request','benchmark','development'));
exception when duplicate_object then null; end $$;
create table if not exists public.registry_refreshes (
  id uuid primary key default gen_random_uuid(),
  registry text not null check (registry in ('vs-marketplace','openvsx')),
  status text not null check (status in ('running','complete','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  extensions_seen integer not null default 0,
  releases_seen integer not null default 0,
  releases_queued integer not null default 0,
  error text
);
alter table public.registry_refreshes enable row level security;
drop policy if exists "public registry refresh status" on public.registry_refreshes;
create policy "public registry refresh status" on public.registry_refreshes for select to anon, authenticated using (true);
grant select on public.registry_refreshes to anon, authenticated;
grant all on public.registry_refreshes to service_role;
create index if not exists extension_versions_discovered_at on public.extension_versions(discovered_at desc);
create index if not exists scans_operational_metrics on public.scans(scan_purpose, scanned_at desc, decision, severity);
create index if not exists registry_refreshes_latest on public.registry_refreshes(registry, completed_at desc);
create or replace function public.public_intelligence_metrics()
returns table (
  indexed_extensions bigint, exact_releases_indexed bigint,
  exact_releases_analyzed bigint, analyzer_complete_reports bigint,
  known_bad_artifacts bigint, block_decisions bigint,
  high_risk_reviews bigint, latency_sample_size bigint,
  median_minutes numeric, p95_minutes numeric
)
language sql stable security invoker set search_path = public as $$
  with operational as (
    select s.*, v.discovered_at
    from public.scans s
    left join public.extension_versions v on v.extension_id = s.extension_id and v.version = s.version
    where s.scan_purpose = 'public_intelligence' and s.superseded_at is null
  ), identities as (
    select distinct extension_id, version, artifact_sha256 from operational
  ), latency as (
    select extract(epoch from scanned_at - discovered_at) / 60.0 as minutes
    from operational where discovered_at is not null and scanned_at >= discovered_at
  )
  select
    (select count(*) from public.extensions),
    (select count(*) from public.extension_versions),
    (select count(*) from identities),
    (select count(*) from identities i join operational o using(extension_id,version,artifact_sha256) where o.decision <> 'incomplete'),
    (select count(distinct (o.extension_id,o.version,o.artifact_sha256)) from operational o join public.findings f on f.scan_id=o.id where f.rule_id='known-bad-artifact'),
    (select count(distinct (extension_id,version,artifact_sha256)) from operational where decision='block'),
    (select count(distinct (extension_id,version,artifact_sha256)) from operational where decision='review' and severity in ('HIGH','CRITICAL')),
    (select count(*) from latency),
    (select percentile_cont(0.5) within group (order by minutes) from latency),
    (select percentile_cont(0.95) within group (order by minutes) from latency);
$$;
revoke all on function public.public_intelligence_metrics() from public;
grant execute on function public.public_intelligence_metrics() to anon, authenticated;
