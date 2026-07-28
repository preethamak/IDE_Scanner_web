# Guardrails Web Architecture

The web product publishes version-specific extension intelligence. It renders canonical scanner results but does not calculate security decisions in the browser or API layer.

## Boundaries

- Next.js routes authenticate requests, enqueue scans, and ingest signed worker callbacks.
- `lib/scanIngest.ts` validates canonical report schema, immutable artifact identity, scanner build identity, and publication eligibility.
- Supabase `scan_jobs`, `scan_job_events`, and `scan_callback_receipts` provide durable job state and audit history. RLS limits user-visible rows; service-role-only RPCs claim and reconcile jobs.
- `app/ExtensionDossier.tsx` owns layout and interaction; `lib/dossierPresentation.ts` owns decision-facing wording and packaged-README selection.

## Lifecycle

The web app queues a Deep Scan, a worker claims it atomically, the worker executes `guardlens-core`, and a signed callback ingests the report. Expired leases and unclaimed queued jobs are reconciled to terminal failures so polling never waits indefinitely.

## Trust rules

Public intelligence requires the canonical report contract, immutable artifact and registry identities, an explicit scanner build, and completed required providers. Hosted-static results and incomplete evidence cannot be published as an approval decision.
