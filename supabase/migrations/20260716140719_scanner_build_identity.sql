-- A report is reproducible only when its scanner implementation is known.
-- Preserve historical scans; never overwrite an earlier build's evidence.
alter table public.scans
  add column if not exists scanner_build text not null default 'unknown',
  add column if not exists analysis_coverage jsonb not null default '{}'::jsonb,
  add column if not exists superseded_at timestamptz;

alter table public.scans
  drop constraint if exists scans_extension_id_version_artifact_sha256_ruleset_version_key;

alter table public.scans
  add constraint scans_artifact_build_identity_unique
  unique (extension_id, version, artifact_sha256, ruleset_version, scanner_build);

create index if not exists scans_reusable_identity
  on public.scans (extension_id, version, scanner_build, scanned_at desc);
