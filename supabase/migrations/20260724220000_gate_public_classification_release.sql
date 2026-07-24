create table if not exists public.scan_publication_releases (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null,
  ruleset_version text not null,
  score_schema_version text not null,
  scanner_build text not null check (scanner_build ~ '^[0-9a-f]{40}$'),
  expected_reports integer not null check (expected_reports > 0),
  report_count_at_activation integer not null check (report_count_at_activation >= expected_reports),
  active boolean not null default false,
  activated_at timestamptz not null default now(),
  unique (policy_version, ruleset_version, score_schema_version, scanner_build)
);

create unique index if not exists scan_publication_releases_one_active
  on public.scan_publication_releases (active)
  where active;

alter table public.scan_publication_releases enable row level security;
drop policy if exists "read active scan publication release" on public.scan_publication_releases;
create policy "read active scan publication release"
  on public.scan_publication_releases
  for select
  to anon, authenticated
  using (active);
revoke all on table public.scan_publication_releases from public, anon, authenticated;
grant select on table public.scan_publication_releases to anon, authenticated;
grant all on table public.scan_publication_releases to service_role;

-- Preserve the broadest currently published classification identity. A single
-- canary scan must never replace the public registry cohort.
with candidate as (
  select
    policy_version,
    ruleset_version,
    score_schema_version,
    scanner_build,
    count(distinct (lower(extension_id), version))::integer as report_count,
    max(scanned_at) as latest_scan
  from public.scans
  where scan_purpose in ('public_intelligence', 'benchmark')
    and analysis_status = 'complete'
    and policy_version <> 'legacy'
    and ruleset_version <> 'unknown'
    and superseded_at is null
  group by policy_version, ruleset_version, score_schema_version, scanner_build
  order by report_count desc, latest_scan desc
  limit 1
)
insert into public.scan_publication_releases (
  policy_version,
  ruleset_version,
  score_schema_version,
  scanner_build,
  expected_reports,
  report_count_at_activation,
  active
)
select
  policy_version,
  ruleset_version,
  score_schema_version,
  scanner_build,
  report_count,
  report_count,
  true
from candidate
on conflict (policy_version, ruleset_version, score_schema_version, scanner_build)
do update set
  expected_reports = excluded.expected_reports,
  report_count_at_activation = excluded.report_count_at_activation,
  active = true,
  activated_at = now();

create or replace function public.activate_scan_publication_release(
  p_policy_version text,
  p_ruleset_version text,
  p_score_schema_version text,
  p_scanner_build text,
  p_expected_reports integer
)
returns public.scan_publication_releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_count integer;
  v_release public.scan_publication_releases;
begin
  perform set_config('statement_timeout', '10s', true);
  if coalesce(p_policy_version, '') in ('', 'legacy')
    or coalesce(p_ruleset_version, '') in ('', 'unknown')
    or coalesce(p_score_schema_version, '') = ''
    or coalesce(p_scanner_build, '') !~ '^[0-9a-f]{40}$'
    or p_expected_reports <= 0 then
    raise exception 'Invalid scan publication release identity';
  end if;

  lock table public.scan_publication_releases in share row exclusive mode;
  select count(distinct (lower(extension_id), version))::integer
  into v_report_count
  from public.scans
  where scan_purpose in ('public_intelligence', 'benchmark')
    and analysis_status = 'complete'
    and policy_version = p_policy_version
    and ruleset_version = p_ruleset_version
    and score_schema_version = p_score_schema_version
    and scanner_build = p_scanner_build
    and superseded_at is null;
  if v_report_count < p_expected_reports then
    raise exception 'Classification release has % complete reports; % required',
      v_report_count, p_expected_reports;
  end if;

  update public.scan_publication_releases set active = false where active;
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
    v_report_count,
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
  return v_release;
end;
$$;

revoke all on function public.activate_scan_publication_release(
  text, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.activate_scan_publication_release(
  text, text, text, text, integer
) to service_role;

comment on table public.scan_publication_releases is
  'Explicit release gate preventing partial scanner rollouts from replacing the public registry cohort.';
