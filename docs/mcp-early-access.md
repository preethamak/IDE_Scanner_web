# GuardRails MCP early access

The read-only Streamable HTTP endpoint is `https://abscissa.dev/api/mcp`.
It exposes published extension intelligence only; it never runs scans, changes
workspace data, or grants access to private reports.

## Available tools

| Tool | Use it for |
| --- | --- |
| `check_extension_risk` | Verify a candidate extension, optionally pinning the exact version. |
| `find_reputable_alternatives` | Find up to five analyzed alternatives when a candidate needs review or is blocked. |

An `unreviewed` result is unknown, not approval. Every completed-result payload
includes an absolute URL to the corresponding public report.

## Authentication

The endpoint is public by default to preserve the existing public-corpus
workflow. Configure `MCP_ACCESS_TOKEN` as a Cloudflare Worker secret to require
`Authorization: Bearer <token>` on every request. The secret is compared using
a constant-time comparison and is never included in logs or responses.

Set `MCP_REQUIRE_AUTH=true` alongside the token for a fail-closed production
guard. If that guard is present without `MCP_ACCESS_TOKEN`, the endpoint
responds with HTTP 503. A missing or invalid bearer token receives HTTP 401 and
a `WWW-Authenticate: Bearer` challenge.

```bash
npx wrangler secret put MCP_ACCESS_TOKEN --config wrangler.jsonc
npx wrangler secret put MCP_REQUIRE_AUTH --config wrangler.jsonc
```

Store `true` for `MCP_REQUIRE_AUTH`. Rotate `MCP_ACCESS_TOKEN` to revoke a
client. This token is suitable for a small early-access cohort; migrate to
OAuth 2.1 before exposing per-user or private data.

## Connect an assistant

Anonymous deployments:

```bash
codex mcp add guardrails --url https://abscissa.dev/api/mcp
claude mcp add --transport http guardrails https://abscissa.dev/api/mcp
```

Token-protected deployments:

```bash
export GUARDRAILS_MCP_TOKEN="..."
codex mcp add guardrails --url https://abscissa.dev/api/mcp --bearer-token-env-var GUARDRAILS_MCP_TOKEN
claude mcp add --transport http guardrails https://abscissa.dev/api/mcp \
  --header "Authorization: Bearer $GUARDRAILS_MCP_TOKEN"
```

Check the connection with `codex mcp list` or Claude Code's `/mcp` command.

## Example workflows

Before recommending a developer extension, ask the assistant: “Use GuardRails
to check `publisher.name` version `1.2.3`; if it is not safe to recommend,
find reputable alternatives for its category.” The first tool establishes the
exact-artifact verdict, and the second only searches analyzed releases.

For an unpinned request, the MCP server returns the latest analyzed release.
Use the exact `version` parameter for install, CI, or procurement decisions.

## Reliability contract

- Stateless JSON-RPC 2.0 requests over HTTP POST; no server-sent event session.
- Supports `initialize`, `notifications/initialized`, `ping`, `tools/list`, and `tools/call`.
- Advertises MCP protocol `2025-06-18`, explicit input/output schemas, and read-only safety annotations.
- Request bodies are limited to 64 KiB. Oversized payloads receive HTTP 413.
- Tool errors remain MCP results with `isError: true`; unknown methods use standard JSON-RPC errors.
- Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

Run the focused contract test before deployment:

```bash
npx vitest run app/api/mcp/route.test.ts
```
