alter table public.scans
  add column if not exists analysis_status text not null default 'incomplete'
    check (analysis_status in ('complete', 'incomplete', 'failed')),
  add column if not exists policy_version text not null default 'legacy',
  add column if not exists intelligence_snapshot jsonb not null default '{}'::jsonb;

update public.scans
set analysis_status = case
  when decision in ('allow', 'review', 'block') then 'complete'
  else 'incomplete'
end
where policy_version = 'legacy';

comment on column public.scans.analysis_status is
  'Canonical analyzer completion state. Consumers must check this before displaying an approval decision.';
comment on column public.scans.policy_version is
  'Versioned deterministic classification policy emitted by the scanner.';
comment on column public.scans.intelligence_snapshot is
  'Version and digest identity for external intelligence inputs used by the scan.';
