# Guardrails Web Architecture

The web product publishes version-specific extension intelligence. It renders canonical scanner results but does not calculate security decisions in the browser or API layer.

## Boundaries

- Next.js routes authenticate requests, enqueue scans, and ingest signed worker callbacks.
- `lib/publicCanonicalContract.ts` is the pure shared admission boundary for canonical public/benchmark reports; both `lib/scanIngest.ts` (Supabase) and `lib/cloudflareDeepScan.ts` (Cloudflare/D1) validate report schema, immutable artifact identity, scanner build identity, runtime coverage, and publication eligibility before persistence.
- Supabase `scan_jobs`, `scan_job_events`, and `scan_callback_receipts` provide durable job state and audit history. RLS limits user-visible rows; service-role-only RPCs claim and reconcile jobs.
- `app/ExtensionDossier.tsx` owns layout and interaction; `lib/dossierPresentation.ts` owns decision-facing wording and packaged-README selection.

## Lifecycle

The web app queues a Deep Scan, a worker claims it atomically, the worker executes the canonical scanner runtime, and a signed callback ingests the report. Expired leases and unclaimed queued jobs are reconciled to terminal failures so polling never waits indefinitely.

## Trust rules

Public intelligence requires the canonical report contract, immutable artifact and registry identities, an explicit scanner build, the deep profile, controlled Bubblewrap runtime evidence for capability-gated execution (or an explicit runtime-not-applicable decision), and completed required providers. Hosted-static, static-only, failed-runtime, and incomplete evidence cannot be published as an approval decision.
