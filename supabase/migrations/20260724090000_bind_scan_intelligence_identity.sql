alter table public.scans
  add column if not exists intelligence_digest text;

update public.scans
set intelligence_digest = coalesce(
  nullif(intelligence_snapshot -> 'registry' ->> 'sha256', ''),
  'legacy'
)
where intelligence_digest is null;

alter table public.scans
  alter column intelligence_digest set default 'legacy',
  alter column intelligence_digest set not null;

alter table public.scans
  drop constraint if exists scans_intelligence_digest_check;

alter table public.scans
  add constraint scans_intelligence_digest_check
  check (intelligence_digest = 'legacy' or intelligence_digest ~ '^[0-9a-f]{64}$');

alter table public.scans
  drop constraint if exists scans_artifact_build_identity_unique;

alter table public.scans
  add constraint scans_artifact_build_intelligence_identity_unique
  unique (
    extension_id,
    version,
    artifact_sha256,
    ruleset_version,
    scanner_build,
    intelligence_digest
  );

comment on column public.scans.intelligence_digest is
  'SHA-256 identity of the external registry and dependency intelligence used for classification.';
