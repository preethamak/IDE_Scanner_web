drop policy if exists "published scans" on public.scans;
drop policy if exists "own requested scans" on public.scans;

-- Keep anonymous access limited to reproducible registry/benchmark evidence.
create policy "published scans"
  on public.scans
  for select to anon
  using (scan_purpose in ('public_intelligence', 'benchmark'));

-- Authenticated users may read the same public evidence or their exact
-- requested result. One policy avoids per-row evaluation of two permissive
-- policies while preserving both visibility contracts.
create policy "published or own requested scans"
  on public.scans
  for select to authenticated
  using (
    scan_purpose in ('public_intelligence', 'benchmark')
    or exists (
      select 1
      from public.scan_job_results result
      join public.scan_jobs job on job.id = result.job_id
      where result.scan_id = scans.id
        and job.requested_by = (select auth.uid())
    )
  );
