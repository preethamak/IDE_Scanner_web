# Admin operations and publishing

The existing dashboard remains at `/admin`. The expanded tools are under
`/admin/operations/`. Migration `0020_admin_operations.sql` is applied by the
existing deployment workflow. No historical data is fabricated or backfilled.

## Implemented scope

| Tool | Behavior and limits |
| --- | --- |
| Scan investigation | Queue status, attempts, stage events and redacted failures. Retry requires a failed job, fewer than three attempts, no competing active job for that release, and the current update timestamp. |
| Conversion funnel | Ordered registry → report → deep scan → watch → workspace events within consenting 30-minute sessions. This measures recorded sessions, not all visitors or causal attribution. |
| Monitoring health | Workspace watch counts, release backlog, recorded status and last/next check times. Missing telemetry remains unknown. |
| Account activity | Account directory, memberships, scan activity and consented events. No account impersonation. |
| API keys | Prefix/label, recorded requests, expiry, last use and revocation. Raw credentials and hashes are excluded. Expired keys fail authentication. |
| AI usage and cost | Provider-reported input/output tokens and versioned operator-configured prices. Missing token counts or prices remain unknown. Prices are snapshotted per request; editing a rate does not rewrite history. |
| Roles and audit | Owner-controlled delegation, capability checks on every API and page, reasons for mutations, optimistic concurrency and transactional audit records. |
| Operational alerts | Dedupe, acknowledge and resolve queue delay, stalled progress, scan failures, provider failures, stale monitoring and delivery failures. Optional HTTPS webhook sends aggregate incident summaries. |
| Report corrections | Current review/correction/withdrawal notices linked to exact published report identity and artifact hash. Original scan evidence remains immutable. Active notices prevent a current allow decision in gates and badges. |
| Detection quality | Human-labeled cases with rule/release identity, rationale, evidence links and immutable review history. Counts describe reviewed cases, never an invented overall accuracy rate. |
| Product facts | Approved, expiring, source-linked facts with shipped/beta/planned labels. Editing invalidates approval; changed or expired facts block publication. |
| Publishing studio | Deterministic source-based drafts, editable descriptions/hashtags/slides, real PDF exports, review, approval, scheduling and LinkedIn company-page delivery. |

Server reads and exports are private/no-store. Lists paginate at 50 rows. Date
filters apply where relevant, with UTC timestamps. Funnel tracking follows
existing visitor consent. Operational accounting does not store prompts or
completions. Usage records and analytics expire after 90 days; audit and review
history remain available.

## Roles

| Role | Access |
| --- | --- |
| Bootstrap owner | All capabilities, including delegating roles to existing accounts |
| Administrator | All operational and publishing capabilities; cannot delegate access |
| Viewer | Analytics only |
| Operator | Accounts, operations, key controls and report/quality reviews |
| Editor | Analytics, blog content, facts and draft preparation |
| Publisher | Analytics, content and publishing review/approval/scheduling |

`ABSCISSA_ADMIN_USER_IDS` remains the immutable owner allowlist. Delegation uses
an existing account ID, never an email match. Revocation takes effect at the next
request. The approval capability is separate from editing, but a publisher can
also edit; this is not a mandatory two-person approval policy.

## Publishing setup

The deployment workflow copies these **optional GitHub Actions secrets** into
Worker secrets when supplied. It never prints values:

- `LINKEDIN_ACCESS_TOKEN`: approved organization publishing token.
- `LINKEDIN_ORGANIZATION_URN`: exact company destination, e.g. `urn:li:organization:123`.
- `LINKEDIN_API_VERSION`: supported six-digit LinkedIn version, e.g. `202609`.
- `LINKEDIN_TOKEN_EXPIRES_AT`: actual token expiry as an ISO timestamp.
- `ADMIN_ALERT_WEBHOOK_URL`: optional HTTPS operational alert destination.

LinkedIn requires organization publishing access (`w_organization_social`) and an
appropriate company-page role. Reconciliation reads may require additional read
permission. There is no browser automation, personal-page fallback, automatic
OAuth enrollment, paid generation dependency or fabricated connection status.
Without the real company connection, drafts, approvals and PDFs work; scheduling
is blocked with the missing configuration visible. Removing a GitHub secret does
not delete an existing Worker secret; revoke/delete it in Cloudflare when retiring
an integration.

Workflow: approve source facts → choose facts and format → generate → edit and
save → export/check PDF and caption → request review → confirm claims and approve
→ schedule. Editing a draft resets approval and any schedule. All published
claims are the reviewer's responsibility; generation rearranges approved facts,
not arbitrary unsupported content. Source links are restricted to public HTTPS
Abscissa pages. PDFs use standard Latin fonts; non-Latin text requires a future
embedded-font implementation.

The five-minute Worker cron prepares documents up to ten minutes ahead and polls
LinkedIn processing before publishing due posts. A schedule is not a guarantee of
exact-minute delivery. Destination, artifact hash and source facts are checked
again before sending. A request with an ambiguous outcome enters `unknown` and
is **never automatically submitted again**. Inspect the company page, then
reconcile using the actual post URN; the server verifies the company, caption and
document. Cancelling does not retract an already published or in-flight post.
No real posts are sent by tests.

References:
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api

## Subdomain and sign-in

`wrangler.jsonc` declares `admin.abscissa.dev` as a Worker custom domain. The
production deploy account must have the Cloudflare zone permissions needed to
attach it. A PR does not create DNS or deploy the host.

The admin host redirects `/` to `/admin`, bypasses public HTML caching, and sends
product routes to `abscissa.dev`. Sign-in runs through the existing apex account
flow, then redeems a hashed, 60-second, single-use ticket bound to a browser
challenge. Roles are checked before ticket creation and redemption. Sessions stay
host-only; no parent-domain session cookie or credentials in local storage.

Report status is fetched fresh by public report banners, badge decisions and
gates. The Worker bypasses HTML edge caching for extensions with active notices
(and when notice storage is unavailable). Previously downloaded reports and
third-party cached images cannot be recalled; consumers should use current
report/gate endpoints for a new decision.

## Verification

`npm test` includes real SQLite migration/query/transaction tests covering role
revocation, retry races, ordered funnels, key expiry, token pricing, alert
lifecycles, immutable evidence, concurrent quality reviews, fact approval,
PDF generation, company-only publishing, ambiguous outcomes and ticket replay.
Use `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm run cf:build`.
Before production use, verify real company permissions/token expiry and the new
host after deployment. Do not infer either from passing mock-based API tests.
