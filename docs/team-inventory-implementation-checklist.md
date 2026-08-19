# Team Inventory Implementation Checklist

This checklist defines the first production-shaped team inventory slice. A checked item must have implementation and automated evidence in the same commit series.

## Scope

- [x] Import a bounded JSON inventory exported by the GuardRails CLI or compatible tooling.
- [x] Store team-scoped devices, immutable import runs, and current installed extension versions.
- [x] Deduplicate devices by a caller-provided stable identifier without storing host secrets.
- [x] Show scanned, monitored, unknown, and review-required coverage for the active workspace.
- [x] Allow owners, admins, and analysts to import inventory and add discovered registry extensions to monitoring.
- [x] Allow every workspace member to read inventory; viewers cannot mutate it.
- [x] Preserve exact extension IDs and versions as reported by the source.

## Database and authorization

- [x] Add constrained `team_inventory_devices`, `team_inventory_imports`, and `team_inventory_installations` tables.
- [x] Index every foreign key and the team/status access paths.
- [x] Enable RLS and revoke anonymous access.
- [x] Add member-read and analyst-write policies with both `USING` and `WITH CHECK` where required.
- [x] Add database tests for cross-team isolation and viewer write denial.

## API

- [x] Add `GET /api/teams/[id]/inventory` with summary and device/install rows.
- [x] Add bounded `POST /api/teams/[id]/inventory` import validation.
- [x] Reject malformed identifiers, versions, device metadata, duplicate rows, and oversized imports.
- [x] Upsert one device snapshot transactionally so stale installations do not remain current.
- [x] Return actionable authentication, authorization, validation, and service errors.
- [x] Cover happy path, invalid input, and authorization with unit tests.

## Workspace

- [x] Add Inventory to workspace navigation.
- [x] Add empty, loading, ready, error/retry, and import states.
- [x] Provide a documented JSON example and file picker.
- [x] Display coverage totals and per-installation scan/monitoring state.
- [x] Support bulk monitoring for registry-known extensions.
- [x] Add focused UI contract tests and responsive styles.

## Verification

- [x] Focused database/API/UI tests pass.
- [x] Full unit suite and lint pass.
- [x] Production build passes.
- [x] Browser readiness is run or an environment blocker is recorded precisely.
- [x] Local `main` remains clean apart from the intentionally untracked `extension-ecosystem-paper/` directory.

Verification on 2026-08-20:

- `psql ... -v ON_ERROR_STOP=1 -f supabase/tests/team_inventory_rls.sql` passed against the fully migrated local Supabase database.
- `supabase db lint --local --level warning` reported no schema errors.
- `vitest` passed 98 files and 360 tests.
- `eslint` passed.
- `next build` passed and emitted `/api/teams/[id]/inventory`.
- Browser readiness was attempted. The repository Playwright configuration expects `/usr/bin/chromium`, which is absent in this environment; this is an environment blocker rather than a recorded application assertion failure.

## Deferred follow-up

- Endpoint enrollment and signed automatic uploads.
- VS Code/Cursor/Windsurf extension discovery commands in the CLI repository.
- Inventory history, removals, and device decommissioning UI.
- Policy evaluation and organization-level enforcement.
- Scheduled inventory freshness alerts.
