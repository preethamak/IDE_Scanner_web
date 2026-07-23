-- Marketplace identifiers are case-insensitive, but their canonical display
-- casing comes from the registry. Merge accidental case variants into the row
-- with the richest catalog history without discarding immutable scan evidence.
begin;

create temporary table extension_identity_merge(
  source_id text primary key,
  target_id text not null
) on commit drop;

insert into extension_identity_merge(source_id, target_id)
with ranked as (
  select
    e.id,
    first_value(e.id) over (
      partition by lower(e.id)
      order by count(v.version) desc, e.catalog_rank asc nulls last, e.installs desc, e.id
    ) as target_id,
    count(*) over (partition by lower(e.id)) as identity_count
  from public.extensions e
  left join public.extension_versions v on v.extension_id = e.id
  group by e.id, e.catalog_rank, e.installs
)
select id, target_id
from ranked
where identity_count > 1 and id <> target_id;

do $$
begin
  if exists (
    select 1
    from public.scan_jobs j
    join extension_identity_merge m on m.source_id = j.extension_id
    join public.scan_jobs target
      on target.extension_id = m.target_id
     and target.version = j.version
     and target.profile = j.profile
    where j.status in ('queued', 'running')
      and target.status in ('queued', 'running')
  ) then
    raise exception 'Cannot merge extension identities with conflicting active scan jobs';
  end if;

  if exists (
    select 1
    from public.scans s
    join extension_identity_merge m on m.source_id = s.extension_id
    join public.scans target
      on target.extension_id = m.target_id
     and target.version = s.version
     and target.artifact_sha256 = s.artifact_sha256
     and target.ruleset_version = s.ruleset_version
     and target.scanner_build = s.scanner_build
  ) then
    raise exception 'Cannot merge extension identities with conflicting immutable scans';
  end if;
end
$$;

insert into public.extension_versions(
  extension_id, version, registry, published_at, artifact_sha256,
  artifact_size, download_url, is_latest, is_removed, scan_state,
  latest_scan_id, metadata, discovered_at, last_seen_at
)
select
  m.target_id, v.version, v.registry, v.published_at, v.artifact_sha256,
  v.artifact_size, v.download_url, v.is_latest, v.is_removed, v.scan_state,
  v.latest_scan_id, v.metadata, v.discovered_at, v.last_seen_at
from public.extension_versions v
join extension_identity_merge m on m.source_id = v.extension_id
on conflict (extension_id, version) do update set
  published_at = coalesce(public.extension_versions.published_at, excluded.published_at),
  artifact_sha256 = coalesce(public.extension_versions.artifact_sha256, excluded.artifact_sha256),
  artifact_size = coalesce(public.extension_versions.artifact_size, excluded.artifact_size),
  download_url = coalesce(public.extension_versions.download_url, excluded.download_url),
  is_latest = public.extension_versions.is_latest or excluded.is_latest,
  is_removed = public.extension_versions.is_removed and excluded.is_removed,
  scan_state = case
    when public.extension_versions.latest_scan_id is not null then public.extension_versions.scan_state
    when excluded.latest_scan_id is not null then excluded.scan_state
    when array_position(array['failed','not_scanned','queued','running','incomplete','complete'], excluded.scan_state)
       > array_position(array['failed','not_scanned','queued','running','incomplete','complete'], public.extension_versions.scan_state)
      then excluded.scan_state
    else public.extension_versions.scan_state
  end,
  latest_scan_id = coalesce(public.extension_versions.latest_scan_id, excluded.latest_scan_id),
  metadata = public.extension_versions.metadata || excluded.metadata,
  discovered_at = least(public.extension_versions.discovered_at, excluded.discovered_at),
  last_seen_at = greatest(public.extension_versions.last_seen_at, excluded.last_seen_at);

delete from public.extension_versions v
using extension_identity_merge m
where v.extension_id = m.source_id;

insert into public.watchlist_items(watchlist_id, extension_id, created_at)
select w.watchlist_id, m.target_id, w.created_at
from public.watchlist_items w
join extension_identity_merge m on m.source_id = w.extension_id
on conflict (watchlist_id, extension_id) do nothing;
delete from public.watchlist_items w using extension_identity_merge m where w.extension_id = m.source_id;

insert into public.team_watchlist_items(team_id, extension_id, created_by, created_at)
select w.team_id, m.target_id, w.created_by, w.created_at
from public.team_watchlist_items w
join extension_identity_merge m on m.source_id = w.extension_id
on conflict (team_id, extension_id) do nothing;
delete from public.team_watchlist_items w using extension_identity_merge m where w.extension_id = m.source_id;

update public.scan_jobs j set extension_id = m.target_id
from extension_identity_merge m where j.extension_id = m.source_id;
update public.scans s set extension_id = m.target_id
from extension_identity_merge m where s.extension_id = m.source_id;

-- Repoint each merged release to its newest immutable report. This avoids
-- preserving an older target-row pointer merely because it was non-null.
with latest as (
  select distinct on (s.extension_id, s.version)
    s.extension_id, s.version, s.id, s.analysis_status
  from public.scans s
  where exists (
    select 1 from extension_identity_merge m where m.target_id = s.extension_id
  )
  order by s.extension_id, s.version, s.scanned_at desc, s.id desc
)
update public.extension_versions v
set
  latest_scan_id = latest.id,
  scan_state = case when latest.analysis_status = 'complete' then 'complete' else 'incomplete' end
from latest
where latest.extension_id = v.extension_id and latest.version = v.version;

update public.monitoring_alerts a set extension_id = m.target_id
from extension_identity_merge m where a.extension_id = m.source_id;

delete from public.extensions e
using extension_identity_merge m
where e.id = m.source_id;

commit;
