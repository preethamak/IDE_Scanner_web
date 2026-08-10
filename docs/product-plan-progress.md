# GuardRails product plan progress

This is the repository-owned tracker for the website-wide product and design plan. Update it in the same commit that completes a milestone.

## Current focus

**Next milestone:** Validate billing end to end in a configured deployment, including Checkout, Portal, subscription changes, cancellation, failed payment, trial behavior, and applied-database authorization tests. Native runtime expansion is paused until this commercial milestone is complete.

The global appearance contract now supports persistent Light, Dark, and System preferences without a first-render theme flash. Shared controls use semantic foreground/background tokens, and the landing hero uses a theme-aware Vanta Fog enhancement that is not initialized for reduced-motion visitors. A canonical-route Light/Dark Playwright and Axe matrix plus a screenshot specification is committed as the release gate; browser execution and reviewed baselines remain required in browser-enabled CI before the theme milestone is considered deployment-validated.

Billing foundation now shipped: canonical server-owned plans, workspace subscription and usage records, fail-closed entitlement evaluation, concurrency-safe database limits for monitoring, membership acceptance, and notification channels, API-gated audit export, plus signed Stripe reconciliation with duplicate suppression, retryable failures, live processing leases, abandoned-worker recovery, and workspace usage visibility. Production purchase availability still depends on configured Stripe products and credentials; the broader pricing milestone remains open until deployment validation covers the complete lifecycle.

Audit-history reads and downloads now apply the effective workspace plan’s retention window at every underlying event query, so direct API requests cannot retrieve history older than the plan allows. Physical archival/deletion policy remains deployment work rather than being implied by the read boundary.

The public landing route is now deliberately shorter—hero, proof, interactive release diff, and one closing action—while the workspace opens as a warm editorial release room with a floating navigation rail and decision-first signal canvas rather than a generic metric dashboard.

Registry discovery now separates exact publisher identities from extension matches, exposes verified publisher catalog pages, and shows Marketplace install/rating signals as popularity context—not security conclusions.

Exact-release reports now use one content-sized identity/outcome/action hero, a compact immutable utility row, first-viewport evidence metrics, an inspectable inline decision trace, and a sticky left report sidebar. Twelve competing tabs were consolidated into eight customer-oriented sections; mobile uses a report-section selector instead of a second horizontal navigation bar.

## Completed

- [x] Website typography tokens and readable global baseline.
- [x] Typography regression budget (`npm run test:typography`).
- [x] Neutral structural palette with logo-derived blue, pink, and lime accents.
- [x] Simplified public navigation and customer-facing footer language.
- [x] Homepage interactive Permission Diff.
- [x] Extension Permission Passport.
- [x] Shared Button, Badge, SelectField, and StatePanel primitives.
- [x] Internal `/design-system` component gallery.
- [x] Version-bound extension release timeline.
- [x] Registry product refresh and exact-release signal.
- [x] Workspace shell, custom switcher, sign out, overview, and review inbox foundation.
- [x] Distinctive decision-first workspace overview and concise, product-led landing composition.

## In progress / next

- [x] Modernize sign-in and signed-in account states.
- [x] Modernize the CLI product page and installation journey.
- [x] Replace the landing hero's weak first visual/copy and add a distinctive light atmospheric background.
- [x] Complete a cross-site button contrast and readable-type audit without dark green surfaces.
- [x] Modernize the immutable Deep Scan report and fix Deep Scan reliability defects.
- [x] Improve extension-logo loading, caching, and resilient fallbacks.
- [x] Modernize the browser-local Reports library with portable-evidence language and safe deletion.
- [x] Modernize Analyze around honest Registry, CLI, and local-report boundaries.
- [x] Modernize Monitor and open authenticated users directly in release monitoring.
- [x] Modernize Security and Privacy into an explicit public trust center.
- [x] Modernize Settings into a clear analysis-boundaries map.
- [x] Modernize Research into an evidence-bound editorial library.
- [x] Modernize Benchmark without weakening its exact-evidence publication gate.
- [x] Replace the homepage's dominant blue and dark panels with a warm, light evidence-led treatment.
- [x] Publish honest packaging definitions without presenting unfinished billing as available.

- [x] Dedicated workspace release-review panel with exact-version context.
- [x] Allow/block/exception decision flow with required rationale.
- [x] Review audit receipt and richer retry recovery with preserved rationale.
- [x] Complete onboarding after workspace creation: first extension, baseline, teammate, notifications.
- [x] Clearly labeled, non-destructive sample workspace for first-time users.
- [x] Monitoring health: provider status, last check, next expected check, attention states, refresh, and per-extension last events.

## Later milestones

### Extension workflow

- [x] Normalize Permission Passport into files, terminal, network, secrets, editor, and agents.
- [x] Reuse Permission Diff on extension and workspace review routes.
- [x] Add latest-versus-analyzed freshness status.
- [x] Add exportable/shareable Permission Passport.

### Workspace and retention

- [x] Member and role administration safeguards with atomic final-owner protection.
- [x] Notification center and integration test-delivery flows with channel health.
- [x] Weekly email/Slack security digest with idempotent scheduling and delivery history.
- [x] Personal assigned-review queue and persistent saved filters.
- [x] Unified audit timeline with role-aware CSV/JSON export and integrity hash.

### Public product

- [x] Migrate Analyze, CLI, Monitor, Account, Reports, Research, Benchmark, Security, Privacy, and Settings copy.
- [ ] Add pricing and packaging.
- [x] Add developer, engineering-team, security-team, and AI-agent solution pages.
- [x] Add a live product status page with public JSON, honest unknown states, and incident history.

### Secure IDE

- [x] Human-readable permission editor with explicit resource and action previews.
- [x] Interactive agent, extension, and delegated-tool selection.
- [x] Once-only, session, and workspace permission scopes with session expiration and revocation.
- [x] Secret, network, command, and filesystem broker contract demonstrations with secret-safe receipts.
- [x] Browser-local audit timeline, policy templates, and policy-version comparison.
- [ ] Native sandbox/runtime implementation beyond the browser preview.

Phase 1 now includes a separated Rust supervisor with IPC v1, stable principals, fail-closed exact matching, chained audit records, and a Linux `openat2` read-broker spike that rejects traversal and symlink escapes while binding reads to audited allow decisions. The native-runtime checkbox remains open: write and sensitive-file policy, isolated untrusted processes, and the full Linux conformance suite are not complete.

### Design-system migration

- [ ] Migrate canonical routes to shared primitives.
- [x] Add persistent Light, Dark, and System appearance controls with semantic shared-control colors.
- [x] Add a theme-aware, reduced-motion-safe Vanta Fog landing enhancement.
- [x] Reduce the legacy sub-11px typography budget from 627 to zero.
- [ ] Consolidate legacy global stylesheets into tokens, primitives, and route-scoped modules.
- [x] Add a canonical-route Light/Dark accessibility matrix and screenshot-based visual-regression specification.
- [ ] Review and accept the Light/Dark screenshot baselines in browser-enabled CI.

## Definition of done for each milestone

1. Product behavior is implemented, not represented by static marketing-only UI.
2. Loading, empty, success, error, and unauthorized states are covered where applicable.
3. Typography uses the shared 12px minimum scale.
4. Keyboard and reduced-motion behavior are supported.
5. Focused tests, full Vitest, ESLint, TypeScript, and production build pass.
6. The tracker is updated and the work is committed as a logical change.
