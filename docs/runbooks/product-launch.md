# Product Launch Runbook

## Release gate

Run `npm run launch:readiness -- --with-health` with `LAUNCH_HEALTH_URL` and
`LAUNCH_HEALTH_SECRET` set. Do not promote when the active public release is
missing, incomplete, stale, or the health endpoint reports a non-2xx response.

## Runner outage

The public report remains available. Pause acquisition copy that promises a new
scan, inspect `scan_runner_status`, and restore the GitHub Actions runner.
Queued work is retained; do not manually rewrite report outcomes.

## Failed scan ingestion

Inspect callback receipts and the atomic scan-result ingestion logs. Retry only
the exact job after fixing the callback or runner issue. A failed/incomplete
scan must remain incomplete; never convert it to an allow decision.

## Incorrect public classification

Deactivate or replace the active publication release through the existing
release activation procedure. Preserve the immutable scan record and publish a
new, complete release identity; do not mutate an artifact report in place.

## Stale public release

Run catalog refresh, confirm the expected report count, then activate a new
release only after the exact cohort is complete. The catalog workflow calls
launch health and must fail until this condition is restored.

## Notification provider outage

Disable the affected team channel. The worker records bounded failures and
stops after five attempts; re-enable a validated channel after the provider is
healthy. Do not expose encrypted targets in debugging output.

## RLS regression

Pause workspace mutations, apply the last known-good migration state through a
forward corrective migration, and verify owner/admin/analyst/viewer/non-member
access against a staging Supabase project before resuming production writes.
