# Release-readiness audit

Date: 2026-08-02  
Scope: `83bb58d...30c5c0f` and the production customer journey at `ide-scanner.vercel.app`.

## Verified customer journey

| Journey | Result | Evidence |
| --- | --- | --- |
| Homepage search → Registry | Pass | Search preserves the query in `/registry?q=GitHub%20Copilot`. |
| Registry search → public profile | Pass | Exact and related results expose only profile destinations. |
| Reviewed Registry card → public profile | Pass | Production cards now route to `/extensions/[id]`, not directly to report routes. |
| Public profile → README → report | Pass | GitHub Copilot profile rendered the inline README, release history, and two explicit report links. |
| Analyze is a file-only route | Pass | Production exposes only `Upload VSIX` and `Import report`. |
| Phone profile | Pass | At 390×844, identity, report action, install action, release summary, README, and versions are readable without overlap or blank mast. |
| Signed-in Deep Scan completion | Blocked | Requires a real authenticated account/OTP; do not fabricate this test. |

Screenshots are retained in the ephemeral audit run directory for this review session.

## Code review

### Spec conformance

1. **Partial — stylesheet ownership is not complete.** `app/layout.tsx` still loads `globals.css`, `guardrails.css`, and `visual-refresh.css`; the latter two retain broad selectors and `!important` declarations that target reports, profiles, and shared controls. This conflicts with TASK-016/017 and CON-002. The product is currently stable only because later style layers counter earlier ones.
2. **Partial — Deep Scan lifecycle remains one component.** `app/DeepScanButton.tsx` still combines request, polling, terminal, and rescan presentation and retains the `showReportLink` switch. It no longer produces the original dead end, but it does not meet TASK-010's explicit lifecycle separation.
3. **Partial — internal Dossier terminology remains.** The top-level route component is now `AnalysisReport`, but `app/dossier/*`, report-contract types, and CSS selectors retain the previous term. Customer-facing strings are removed; the planned code/path migration remains unfinished.
4. **Partial — visual regression suite is not baseline-backed.** Existing Playwright tests verify responsive dimensions and core destinations, but TASK-022's four visual screenshot baselines have not yet been added.

### Standards and maintainability

1. **Medium — presentation state is coupled to network checks.** The Deep Scan button has health, auth, queue, polling, terminal message, and link-routing responsibilities in one component. A small state controller plus focused action components would make state transitions testable without browser routing mocks.
2. **Low — the shared page model is only partly adopted.** `extensionPageModel` centralizes report URLs and decisions for the profile and scan fallback, but its `hasPublicReport` field is not consumed and the report routes still reconstruct their own model. Either adopt it at all route boundaries or reduce it to the two helpers actually used.

## Customer experience findings

1. **High — Registry search has a long unstructured wait.** Searching `GitHub Copilot` took approximately ten seconds before results appeared. During this time the page kept the full unrelated reviewed-extension list beneath a `Searching…` button. A customer can reasonably believe the search failed or that the list is the result. Use a result-area loading state that replaces the reviewed list while Marketplace search is pending, then render the exact match first.
2. **Medium — homepage remains too dense for a first-time buyer.** It has a clear search box, but it also presents multiple report cards, workflow tabs, external press links, monitoring content, and repeated CTAs. The first screen should make one promise and one action unmistakable; secondary proof should follow after the search task.
3. **Low — profile report action is intentionally duplicated.** It appears in the header and release summary. This is defensible for long README pages, but it should be tested against the final visual hierarchy after the CSS migration.

## Next implementation order

1. Make Registry search a dedicated results state with a loading skeleton and no unrelated cards.
2. Split Deep Scan state control from request/progress/terminal actions and add transition tests.
3. Consolidate the extension-intelligence selectors into one owned stylesheet; remove the corresponding broad rules rather than overriding them.
4. Add 1440×900, 1366×768, 768×1024, and 390×844 screenshot baselines for home, Registry results, profile, and report.
5. Complete one authenticated Deep Scan in production and record the report URL/state transition.
