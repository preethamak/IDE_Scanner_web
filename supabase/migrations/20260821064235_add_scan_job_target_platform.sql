alter table public.scan_jobs
  add column target_platform text not null default ''
  check (target_platform = '' or target_platform ~ '^[a-z0-9][a-z0-9-]{0,31}$');

comment on column public.scan_jobs.target_platform is
  'Exact VS Marketplace artifact platform variant requested by the canonical worker; empty means the registry default.';
