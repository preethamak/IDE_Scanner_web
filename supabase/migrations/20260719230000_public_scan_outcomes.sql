alter table public.scans
  add column if not exists public_outcome text not null default 'incomplete'
    check (public_outcome in ('clear','expected_capability','investigate','preventive_block','confirmed_threat','incomplete')),
  add column if not exists decision_basis text not null default 'incomplete',
  add column if not exists evidence_confidence text not null default 'none'
    check (evidence_confidence in ('none','low','medium','high','contextual','confirmed')),
  add column if not exists provenance_tier text not null default 'unknown'
    check (provenance_tier in ('unknown','verified','established','conflicted')),
  add column if not exists expected_profile_id text,
  add column if not exists capability_assessment jsonb not null default '{}'::jsonb,
  add column if not exists score_schema_version text not null default '1';

update public.scans
set
  public_outcome = case
    when decision = 'allow' then 'clear'
    when decision = 'review' then 'investigate'
    when decision = 'block' and verdict = 'malicious' then 'confirmed_threat'
    when decision = 'block' then 'preventive_block'
    else 'incomplete'
  end,
  decision_basis = case
    when decision = 'allow' then 'legacy_no_actionable_evidence'
    when decision = 'review' then 'legacy_review_result'
    when decision = 'block' and verdict = 'malicious' then 'legacy_authoritative_threat_evidence'
    when decision = 'block' then 'legacy_preventive_policy'
    else 'legacy_incomplete_analysis'
  end,
  evidence_confidence = case
    when decision = 'block' and verdict = 'malicious' then 'confirmed'
    when decision = 'block' then 'high'
    when decision = 'review' then 'medium'
    else 'none'
  end
where score_schema_version = '1';

create index if not exists scans_public_outcome_recent
  on public.scans(public_outcome, scanned_at desc)
  where superseded_at is null;

-- Public reproducibility applies only to registry-intelligence and benchmark
-- scans. User-request and development reports remain visible to their owner
-- through the existing scan-job relationship.
drop policy if exists "public scans" on public.scans;
create policy "published scans" on public.scans for select to anon, authenticated
  using (scan_purpose in ('public_intelligence', 'benchmark'));
create policy "own requested scans" on public.scans for select to authenticated
  using (exists (
    select 1 from public.scan_jobs j
    where j.id = scans.job_id and j.requested_by = (select auth.uid())
  ));

drop policy if exists "public findings" on public.findings;
create policy "visible scan findings" on public.findings for select to anon, authenticated
  using (exists (select 1 from public.scans s where s.id = findings.scan_id));

drop policy if exists "public files" on public.artifact_files;
create policy "visible scan files" on public.artifact_files for select to anon, authenticated
  using (exists (select 1 from public.scans s where s.id = artifact_files.scan_id));

drop policy if exists "public dependencies" on public.dependencies;
create policy "visible scan dependencies" on public.dependencies for select to anon, authenticated
  using (exists (select 1 from public.scans s where s.id = dependencies.scan_id));

drop policy if exists "public stored source previews" on public.artifact_file_previews;
create policy "visible scan source previews" on public.artifact_file_previews for select to anon, authenticated
  using (exists (select 1 from public.scans s where s.id = artifact_file_previews.scan_id));
