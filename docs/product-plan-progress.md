# GuardRails product plan progress

This is the repository-owned tracker for the website-wide product and design plan. Update it in the same commit that completes a milestone.

## Current focus

**Next milestone:** Finish billing and entitlement enforcement, then complete the browser IDE control-plane experience. The complete GuardRails roadmap remains active.

Billing foundation now shipped: canonical server-owned plans, workspace subscription and usage records, fail-closed entitlement evaluation, concurrency-safe database limits for monitoring, membership acceptance, and notification channels, API-gated audit export, plus signed retry-safe Stripe reconciliation and workspace usage visibility. Production purchase availability still depends on configured Stripe products and credentials; the broader pricing milestone remains open until deployment validation covers the complete lifecycle.

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
- [ ] Secret, network, and command broker demonstrations.
- [ ] Audit timeline and policy templates.
- [ ] Native sandbox/runtime implementation beyond the browser preview.

### Design-system migration

- [ ] Migrate canonical routes to shared primitives.
- [x] Reduce the legacy sub-11px typography budget from 627 to zero.
- [ ] Consolidate legacy global stylesheets into tokens, primitives, and route-scoped modules.
- [ ] Add screenshot-based visual regression when a browser is available in CI.

## Definition of done for each milestone

1. Product behavior is implemented, not represented by static marketing-only UI.
2. Loading, empty, success, error, and unauthorized states are covered where applicable.
3. Typography uses the shared 12px minimum scale.
4. Keyboard and reduced-motion behavior are supported.
5. Focused tests, full Vitest, ESLint, TypeScript, and production build pass.
6. The tracker is updated and the work is committed as a logical change.
