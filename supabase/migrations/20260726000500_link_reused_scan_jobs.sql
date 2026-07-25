create table public.scan_job_results (
  job_id uuid primary key references public.scan_jobs(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete restrict,
  linked_at timestamptz not null default now()
);

create index scan_job_results_scan_id
  on public.scan_job_results (scan_id);

insert into public.scan_job_results (job_id, scan_id)
select scan.job_id, scan.id
from public.scans scan
where scan.job_id is not null
on conflict (job_id) do nothing;

alter table public.scan_job_results enable row level security;
drop policy if exists "read own scan result links" on public.scan_job_results;
create policy "read own scan result links"
  on public.scan_job_results
  for select to authenticated
  using (exists (
    select 1
    from public.scan_jobs job
    where job.id = job_id
      and job.requested_by = (select auth.uid())
  ));

revoke all on table public.scan_job_results from public, anon, authenticated;
-- Anonymous callers receive no rows because no anon policy exists. Granting
-- table-level SELECT lets the shared public/authenticated data client use one
-- stable query shape without turning a signed-out request into an error.
grant select on table public.scan_job_results to anon, authenticated;
grant all on table public.scan_job_results to service_role;

drop policy if exists "own requested scans" on public.scans;
create policy "own requested scans"
  on public.scans
  for select to authenticated
  using (exists (
    select 1
    from public.scan_job_results result
    join public.scan_jobs job on job.id = result.job_id
    where result.scan_id = scans.id
      and job.requested_by = (select auth.uid())
  ));

alter function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) rename to publish_scan_result_storage;

revoke all on function public.publish_scan_result_storage(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) from public, anon, authenticated, service_role;

create function public.publish_scan_result_atomically(
  p_job_id uuid,
  p_scan jsonb,
  p_findings jsonb default '[]'::jsonb,
  p_files jsonb default '[]'::jsonb,
  p_dependencies jsonb default '[]'::jsonb,
  p_previews jsonb default '[]'::jsonb,
  p_receipt_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scan_id uuid;
begin
  v_scan_id := public.publish_scan_result_storage(
    p_job_id,
    p_scan,
    p_findings,
    p_files,
    p_dependencies,
    p_previews,
    p_receipt_id
  );

  insert into public.scan_job_results (job_id, scan_id)
  values (p_job_id, v_scan_id)
  on conflict (job_id) do update
  set scan_id = excluded.scan_id,
      linked_at = now()
  where public.scan_job_results.scan_id = excluded.scan_id;

  if not found then
    raise exception 'A scan job cannot be linked to two immutable results';
  end if;

  return v_scan_id;
end;
$$;

revoke all on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) to service_role;

comment on table public.scan_job_results is
  'Links every completed scan request to its immutable result, including safely reused results.';
comment on function public.publish_scan_result_atomically(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) is
  'Atomically publishes or reuses an immutable scan and binds it to the requesting job.';
