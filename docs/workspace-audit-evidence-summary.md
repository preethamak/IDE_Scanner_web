# Workspace audit evidence summary

`GET /api/teams/<workspace-id>/audit?format=summary` returns a compact,
role-aware summary of the same filtered audit records available from the
workspace audit endpoint. It is intended for review packets, governance
meetings, and integrations that need counts before retrieving the full event
stream.

The response includes a SHA-256 manifest of the exact events summarized, time
bounds, event and extension counts, recorded decision outcomes, delivery
outcomes, and risk-labelled event counts. It contains no notification targets,
credentials, or source previews.

The summary is historical. It does not claim that a workspace is currently
safe, resolve an alert, approve an extension, or replace the exact release
report behind a decision. Use the manifest hash and full audit endpoint when a
review requires event-level evidence.
