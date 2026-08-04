-- A watch is only decision-ready after a team explicitly selects a completed
-- exact-artifact baseline. Existing watches remain valid discovery watches,
-- but are labelled baseline_pending rather than silently approved.
alter table public.team_watchlist_items
  add column if not exists baseline_scan_id uuid references public.scans(id) on delete set null,
  add column if not exists baseline_version text,
  add column if not exists baseline_artifact_sha256 text,
  add column if not exists monitoring_state text not null default 'baseline_pending',
  add column if not exists last_observed_version text,
  add column if not exists last_event_at timestamptz;

alter table public.team_watchlist_items
  drop constraint if exists team_watchlist_items_monitoring_state_check;
alter table public.team_watchlist_items
  add constraint team_watchlist_items_monitoring_state_check
  check (monitoring_state in ('baseline_pending', 'monitoring', 'release_detected', 'analysis_incomplete', 'analysis_failed'));

alter table public.team_watchlist_items
  drop constraint if exists team_watchlist_items_baseline_identity_check;
alter table public.team_watchlist_items
  add constraint team_watchlist_items_baseline_identity_check
  check (
    monitoring_state <> 'monitoring'
    or (baseline_scan_id is not null and baseline_version is not null and baseline_artifact_sha256 is not null)
  );

create index if not exists team_watchlist_items_monitoring_extension
  on public.team_watchlist_items(extension_id, monitoring_state);

-- The table was already RLS-protected. Keep the existing private helper
-- policies as the authorization boundary and avoid widening grants.
