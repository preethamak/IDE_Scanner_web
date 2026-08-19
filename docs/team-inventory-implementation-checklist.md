# Team Inventory Implementation Checklist

This checklist defines the first production-shaped team inventory slice. A checked item must have implementation and automated evidence in the same commit series.

## Scope

- [ ] Import a bounded JSON inventory exported by the GuardRails CLI or compatible tooling.
- [ ] Store team-scoped devices, immutable import runs, and current installed extension versions.
- [ ] Deduplicate devices by a caller-provided stable identifier without storing host secrets.
- [ ] Show scanned, monitored, unknown, and review-required coverage for the active workspace.
- [ ] Allow owners, admins, and analysts to import inventory and add discovered registry extensions to monitoring.
- [ ] Allow every workspace member to read inventory; viewers cannot mutate it.
- [ ] Preserve exact extension IDs and versions as reported by the source.

## Database and authorization

- [ ] Add constrained `team_inventory_devices`, `team_inventory_imports`, and `team_inventory_installations` tables.
- [ ] Index every foreign key and the team/status access paths.
- [ ] Enable RLS and revoke anonymous access.
- [ ] Add member-read and analyst-write policies with both `USING` and `WITH CHECK` where required.
- [ ] Add database tests for cross-team isolation and viewer write denial.

## API

- [ ] Add `GET /api/teams/[id]/inventory` with summary and device/install rows.
- [ ] Add bounded `POST /api/teams/[id]/inventory` import validation.
- [ ] Reject malformed identifiers, versions, device metadata, duplicate rows, and oversized imports.
- [ ] Upsert one device snapshot atomically enough to prevent stale installations from remaining current.
- [ ] Return actionable authentication, authorization, validation, and service errors.
- [ ] Cover happy path, invalid input, and authorization with unit tests.

## Workspace

- [ ] Add Inventory to workspace navigation.
- [ ] Add empty, loading, ready, partial/error, and import states.
- [ ] Provide a documented JSON example and file picker.
- [ ] Display coverage totals and per-installation scan/monitoring state.
- [ ] Support bulk monitoring for registry-known extensions.
- [ ] Add focused UI contract tests and responsive styles.

## Verification

- [ ] Focused database/API/UI tests pass.
- [ ] Full unit suite and lint pass.
- [ ] Production build passes.
- [ ] Browser readiness is run or an environment blocker is recorded precisely.
- [ ] Local `main` remains clean apart from the intentionally untracked `extension-ecosystem-paper/` directory.

## Deferred follow-up

- Endpoint enrollment and signed automatic uploads.
- VS Code/Cursor/Windsurf extension discovery commands in the CLI repository.
- Inventory history, removals, and device decommissioning UI.
- Policy evaluation and organization-level enforcement.
- Scheduled inventory freshness alerts.
