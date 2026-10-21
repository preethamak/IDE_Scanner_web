# API Key Usage Audit

Workspace owners and administrators can inspect machine-key activity at:

```text
GET /api/teams/{team_id}/api-key-usage?limit=50
GET /api/teams/{team_id}/api-key-usage?key_id={key_uuid}&limit=50
```

The endpoint requires a signed-in owner or administrator. It returns the most
recent activity first and accepts a limit from 1 through 200.

Each record contains only the API key id, HTTP method, path, and timestamp.
GuardRails deliberately does not store raw bearer credentials, query values,
request bodies, IP addresses, or response content in this activity ledger.

Usage recording is best-effort: a transient audit-storage failure never turns a
valid, correctly-scoped API key into a failed automation run. Treat an empty
usage history as no recorded activity, not as a claim that a key has never
been used.
