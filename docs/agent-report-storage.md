# Agent report storage

Local GuardRails agents upload completed reports to `POST /api/agent/reports`.
When the Cloudflare private D1 binding is available, GuardRails stores these
reports in `app_agent_reports`, not the web process filesystem.

Small reports are stored as one JSON value. Larger reports use ordered rows in
`app_agent_report_chunks`; the metadata row and every chunk are written in a
single D1 batch. Reads reject a missing or out-of-order chunk set rather than
returning partial evidence.

Apply `d1/migrations/0016_agent_report_storage.sql` before deploying code that
expects durable agent reports. A local Node development server without the D1
binding continues to use `.ide-scanner-reports` for developer convenience only.
That fallback is never selected when the Cloudflare binding is available: a D1
write error must surface so production storage failures are observable.

Agent source previews remain redacted before either storage path receives a
report. This database only holds the already-redacted report payload.
