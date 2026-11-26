# Abscissa administration

Open `https://abscissa.dev/admin` and sign in with the operator's GitHub account.
This implementation uses Abscissa's own components and services. It does not
embed, import code from, contact, or send events to another company's dashboard.

See [Admin operations and publishing](admin-operations.md) for the expanded tools,
role delegation, current report notices, company publishing and admin subdomain.

## Access and deployment

- The server verifies the existing account session, then checks its immutable
  user ID against `ABSCISSA_ADMIN_USER_IDS` or an active delegated admin role. This is a comma-separated allowlist,
  not a workspace role or an email match. The production Wrangler configuration
  allows `github:167765989`, the repository owner's GitHub identity. Without a bootstrap owner or active delegated role, access is denied. If this account was originally created under a
  different provider, inspect `/api/auth/session` while signed in and explicitly
  configure that existing user ID before use. Never add a client-provided ID.
- Both page rendering and every admin API read/write verify access independently.
  Anonymous page requests go to sign-in; other accounts see a 404. APIs return
  401/403. Responses are private/no-store and excluded from search indexing.
- The existing Cloudflare deployment workflow applies migration
  `d1/migrations/0019_admin_analytics.sql` to `abscissa-scan-data`. No new database,
  external analytics subscription, or provider key is required for D1 pages.
- That workflow also provisions `ANALYTICS_HASH_SECRET` using the existing
  Cloudflare deploy credentials. Set a GitHub Actions secret with that name and
  at least 32 characters to preserve pseudonymous sessions across deployments.
  If omitted, a cryptographically random secret is generated without printing
  it; deployment rotates rate-limit and session hashes. This changes analytics
  continuity, not sign-in sessions. GitHub Actions masks a supplied secret.
- `ABSCISSA_ANALYTICS_ENABLED=true` enables optional visitor collection. Set it
  to `false` to stop collection. Login/provider/MCP operational records remain
  independent of visitor consent. Local Node development needs the same env
  configuration plus a D1 binding; without it, the UI reports unavailable data
  and optional telemetry fails without interrupting the product.
- Newsletter analytics reads the existing Supabase `newsletter_subscribers`
  table with runtime-bound `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
  Without those existing service credentials it shows a configuration error;
  it does not invent zero subscribers. Subscriber email addresses are excluded.
  This PR does not alter newsletter signup or silently provision a paid service.
- PR creation does not deploy anything. Merging to `main` triggers the repository's
  production quality gates and deployment workflow. Review the allowlist first.

## Pages and data

| Page | Source / behavior |
| --- | --- |
| `/admin` and `/admin/users` | Daily consenting visitor sessions and signed-in visitors |
| `/admin/users/all` | D1 account directory, filtered by registration date |
| `/admin/users/paths` | Ordered normalized page sequences per consenting session |
| `/admin/users/referrers` | Referring hostnames only |
| `/admin/users/asn` | Cloudflare autonomous system numbers |
| `/admin/users/locations` | Country codes from Cloudflare |
| `/admin/users/devices` | Broad device and browser categories |
| `/admin/users/login` | Successful D1 session creation |
| `/admin/traffic/pages` | Consented pageview events by normalized route |
| `/admin/traffic/utm` | Campaign source, medium, and campaign |
| `/admin/engagements/queries` | Existing typed product events, without search text |
| `/admin/engagements/shares` | Successful report-link and badge-copy actions |
| `/admin/engagements/newsletter` | Existing Supabase subscriber records by source/date |
| `/admin/jobs` | Scan job status, lifecycle stage, attempts, and timestamps |
| `/admin/content` | Private drafts and public blog publishing |
| `/admin/mcp` | Known JSON-RPC methods/tools, HTTP status, latency |
| `/admin/providers` | Marketplace, Open VSX, and Sarvam request health |
| `/admin/llm` | Sarvam request health grouped by model |
| `/admin/security` | Cloudflare bot-score bands; missing scores stay unknown |

All data views have UTC date filters (up to 90 days), filtering where applicable,
50-row pagination, current-page column sorting, and authenticated CSV export.
Exports include only the current page and neutralize spreadsheet formulas.
The content library is filtered by title/slug, not date. Daily charts include
zero days and expose a text table. There is no historical data backfill.
Visitor sessions expire after 30 minutes of inactivity and are not a total
unique-people metric. Login records exclude failed logins and legacy Supabase
sessions that never create a D1 session. Upstream request latency ends at HTTP
response headers; request errors are HTTP/network errors, not inferred model
quality. Token counts, cost, and fraud determinations are not fabricated.

The finance-data provider view is adapted to Abscissa's actual registry and AI
providers; it does not add FMP. Bot scores require Cloudflare Bot Management;
the dashboard does not add IPQS, buy a subscription, or classify missing scores
as safe. Country/ASN data depends on the deployed Cloudflare request context.

## Visitor data boundaries

`/api/analytics/events` accepts only same-origin JSON POSTs with an explicit
consent marker and a small event-name allowlist. The browser adapter follows
`guardrails-consent`, sends no optional events after revocation, and skips admin
routes. The adapter and server both normalize private route segments, remove
query strings, reduce referrers to hostnames, and constrain campaign labels.
Arbitrary payload fields are discarded. No raw IP, search text, package source,
report body, auth token, prompt, completion, or full external URL is stored.
Signed-in visits are linked only after consent; login and operational health are
stored independently to operate the service.

A random HttpOnly SameSite=Lax session cookie (`gr_analytics`) lasts 30 minutes.
D1 stores only its HMAC. The trusted Cloudflare client IP is HMACed with a daily
prefix for an atomic 2,000-event/day per-IP ingestion limit, never stored raw.
These are pseudonymous identifiers, not anonymous data. On production requests
without the trusted IP header collection is skipped. Event bodies are bounded
to 4 KiB while streaming, including chunked requests.

The existing six-hour scheduled job purges analytics older than 90 days and
expired ingestion limits in bounded batches. A large backlog can take several
invocations. This retention is independent of account, scan, and blog retention.
Content saves check origin, request size, access, slug uniqueness, and the last
read version; stale edits return 409. Draft articles never appear in public
queries. Saving a published article as a draft withdraws it. Blog Markdown is
rendered on the server with raw HTML and images disabled and unsafe links
removed. The content editor deliberately has no arbitrary HTML or file upload.

## Verification

```sh
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run test:e2e
npm run build
npm run cf:build
```

`node:sqlite` integration tests exercise the actual D1 SQL, collection limits,
privacy normalization, admin denial, CSV pagination, optimistic publishing,
and retention. Browser tests cover anonymous admin protection and consent.
For a deployed smoke check: sign in as the operator, load every admin section,
allow analytics in a separate visitor session, visit two product pages, and
confirm only recorded data appears. Verify anonymous and other-account access
is denied, save/publish/withdraw a test article, and check `/blog`. Confirm
newsletter service credentials and Cloudflare bot-score availability separately.
Do not merge if the required CI gates fail.
