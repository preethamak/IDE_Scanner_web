# Team Extension Change Loop — Evidence Checklist

Last updated: 2026-08-04

This checklist records only completed work with reproducible evidence. `Implemented` means code is committed; it does not mean production behavior has been proven.

## Current release slice

- [x] **Implemented** — Workspace onboarding collects use case and workspace name, then creates a workspace. Commit `80df450`.
- [x] **Implemented** — A completed Analysis Report can establish an exact scan/version/hash baseline for a writable workspace. Commit `ebbb297`.
- [ ] **Verified** — Apply `20260804090000_add_team_monitoring_baselines.sql` in a disposable Supabase project and prove RLS and baseline constraints.
- [x] **Verified** — Baseline watch API suite passes: 4/4 tests (`npx vitest run app/api/teams/[id]/watchlist/route.test.ts --pool=forks --reporter=verbose`).
- [x] **Verified** — Monitoring lifecycle contract passes: 3/3 tests (`lib/teamMonitoring.test.ts`); incomplete analysis is classified as unavailable, never safe. Commit `2e86d88`.
- [ ] **Verified** — Render desktop and mobile screenshots of onboarding and the completed-report monitoring action.

## End-to-end customer path

- [ ] Create a workspace with a fresh signed-in account.
- [ ] Invite a named colleague and accept with a second account.
- [ ] Select an exact completed report as the monitored baseline.
- [ ] Discover a new extension release and show `release_detected`.
- [ ] Complete the target Deep Scan and show an immutable baseline-to-target comparison. (Database transition implemented; integration verification pending.)
- [ ] Record a team decision with owner, rationale, and due date.
- [ ] Deliver one matching Slack event and one matching email event.
- [ ] Show delivery status, retry, and terminal failure without claiming delivery succeeded.

## Release gates

- [ ] `npx tsc --noEmit` passes after the final implementation.
- [ ] `npm run lint` passes after the final implementation.
- [ ] `npm test` passes with a final summary.
- [ ] `npm run build` passes after the final implementation.
- [ ] Two separate production acceptance runs are documented with redacted evidence.

## Known blockers

- Local Next dev and start processes currently accept startup but do not return HTTP responses; screenshot verification is blocked until diagnosed.
- The focused Vitest process currently starts but does not emit a final summary after the newly added baseline test; do not treat it as passing.
- Live Slack/email verification requires configured service credentials and controlled destination endpoints.
