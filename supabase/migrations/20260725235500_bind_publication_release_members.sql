create table public.scan_publication_release_scans (
  release_id uuid not null references public.scan_publication_releases(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete restrict,
  extension_id text not null,
  version text not null,
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (release_id, scan_id)
);

create unique index scan_publication_release_exact_artifact
  on public.scan_publication_release_scans (release_id, lower(extension_id), version);

alter table public.scan_publication_release_scans enable row level security;
drop policy if exists "read active scan publication members"
  on public.scan_publication_release_scans;
create policy "read active scan publication members"
  on public.scan_publication_release_scans
  for select to anon, authenticated
  using (exists (
    select 1
    from public.scan_publication_releases release
    where release.id = release_id
      and release.active
  ));

revoke all on table public.scan_publication_release_scans
  from public, anon, authenticated;
grant select on table public.scan_publication_release_scans
  to anon, authenticated;
grant all on table public.scan_publication_release_scans
  to service_role;

-- Preserve the cohort selected by the preceding migration during rollout.
insert into public.scan_publication_release_scans (
  release_id, scan_id, extension_id, version, artifact_sha256
)
select distinct on (release.id, lower(scan.extension_id), scan.version)
  release.id,
  scan.id,
  scan.extension_id,
  scan.version,
  scan.artifact_sha256
from public.scan_publication_releases release
join public.scans scan
  on scan.policy_version = release.policy_version
 and scan.ruleset_version = release.ruleset_version
 and scan.score_schema_version = release.score_schema_version
 and scan.scanner_build = release.scanner_build
where release.active
  and scan.scan_purpose in ('public_intelligence', 'benchmark')
  and scan.analysis_status = 'complete'
  and scan.superseded_at is null
order by
  release.id,
  lower(scan.extension_id),
  scan.version,
  scan.scanned_at desc,
  scan.id;

drop function if exists public.activate_scan_publication_release(
  text, text, text, text, integer
);

create function public.activate_scan_publication_release(
  p_policy_version text,
  p_ruleset_version text,
  p_score_schema_version text,
  p_scanner_build text,
  p_expected_reports integer,
  p_scan_ids uuid[]
)
returns public.scan_publication_releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.scan_publication_releases;
  v_report_count integer;
  v_artifact_count integer;
begin
  perform set_config('statement_timeout', '10s', true);
  if coalesce(p_policy_version, '') in ('', 'legacy')
    or coalesce(p_ruleset_version, '') in ('', 'unknown')
    or coalesce(p_score_schema_version, '') = ''
    or coalesce(p_scanner_build, '') !~ '^[0-9a-f]{40}$'
    or p_expected_reports <= 0
    or p_scan_ids is null
    or cardinality(p_scan_ids) <> p_expected_reports
    or (
      select count(distinct scan_id)
      from unnest(p_scan_ids) as supplied(scan_id)
    ) <> p_expected_reports then
    raise exception 'Invalid scan publication release manifest';
  end if;

  lock table public.scan_publication_releases in share row exclusive mode;

  select
    count(*)::integer,
    count(distinct (lower(scan.extension_id), scan.version))::integer
  into v_report_count, v_artifact_count
  from public.scans scan
  where scan.id = any(p_scan_ids)
    and scan.scan_purpose in ('public_intelligence', 'benchmark')
    and scan.analysis_status = 'complete'
    and scan.policy_version = p_policy_version
    and scan.ruleset_version = p_ruleset_version
    and scan.score_schema_version = p_score_schema_version
    and scan.scanner_build = p_scanner_build
    and scan.superseded_at is null;

  if v_report_count <> p_expected_reports
    or v_artifact_count <> p_expected_reports then
    raise exception
      'Classification release manifest has % valid reports across % exact artifacts; % required',
      v_report_count, v_artifact_count, p_expected_reports;
  end if;

  update public.scan_publication_releases
  set active = false
  where active;

  insert into public.scan_publication_releases (
    policy_version,
    ruleset_version,
    score_schema_version,
    scanner_build,
    expected_reports,
    report_count_at_activation,
    active,
    activated_at
  )
  values (
    p_policy_version,
    p_ruleset_version,
    p_score_schema_version,
    p_scanner_build,
    p_expected_reports,
    p_expected_reports,
    true,
    now()
  )
  on conflict (policy_version, ruleset_version, score_schema_version, scanner_build)
  do update set
    expected_reports = excluded.expected_reports,
    report_count_at_activation = excluded.report_count_at_activation,
    active = true,
    activated_at = excluded.activated_at
  returning * into v_release;

  delete from public.scan_publication_release_scans
  where release_id = v_release.id;

  insert into public.scan_publication_release_scans (
    release_id, scan_id, extension_id, version, artifact_sha256
  )
  select
    v_release.id,
    scan.id,
    scan.extension_id,
    scan.version,
    scan.artifact_sha256
  from public.scans scan
  where scan.id = any(p_scan_ids);

  return v_release;
end;
$$;

revoke all on function public.activate_scan_publication_release(
  text, text, text, text, integer, uuid[]
) from public, anon, authenticated;
grant execute on function public.activate_scan_publication_release(
  text, text, text, text, integer, uuid[]
) to service_role;

comment on table public.scan_publication_release_scans is
  'Exact immutable scan membership for an activated public classification release.';
comment on function public.activate_scan_publication_release(
  text, text, text, text, integer, uuid[]
) is
  'Atomically activates only the supplied complete, reproducible exact-artifact scan manifest.';
