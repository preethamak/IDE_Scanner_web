---
goal: Make GuardRails feel like one evidence product instead of a collection of disconnected pages
version: 1.0
date_created: 2026-10-02
last_updated: 2026-10-02
owner: GuardRails
status: 'In progress'
tags: [design, product-ui, information-architecture, reports, comparison]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Reframe the public GuardRails experience around one product spine: discover an extension, understand the exact release, compare its access surface with a baseline, and preserve the decision. The work keeps the existing scan and report data contracts while removing competing visual treatments and making the report and comparison moments primary product surfaces.

## 1. Requirements & Constraints

- **REQ-001**: Make the exact-release report the primary destination after a scan and the clearest product surface on public extension pages.
- **REQ-002**: Make version comparison a first-class action in the extension and report headers, not a secondary link hidden in a list or sidebar.
- **REQ-003**: Use one light visual language with a pale blue canvas, ink typography, thin evidence-grid rules, and restrained coral/yellow status accents; avoid full dark-green or generic dashboard compositions.
- **REQ-004**: Give each critical route one clear job: landing introduces the decision, extension profile frames the package, comparison resolves change, and report provides evidence.
- **REQ-005**: Preserve existing routes, authentication, scan actions, report data contracts, and exact artifact identity behavior.
- **REQ-006**: Keep the landing page's real product demo available, but frame it as evidence of the review workflow rather than decorative hero media.
- **REQ-007**: Preserve accessible headings, keyboard focus, reduced-motion behavior, responsive layouts, and existing route-level metadata.
- **CON-001**: Do not modify the user's dirty workspace; implement from a clean branch based on `origin/main`.
- **CON-002**: Do not deploy production in this change until the redesigned critical routes have been reviewed in preview.
- **GUD-001**: Prefer real product language, real scan states, and real report actions over invented metrics or decorative UI.
- **GUD-002**: Use an editorial evidence-desk composition: asymmetry, visible release identity, explicit decision paths, and comparison at the point of consequence.

## 2. Implementation Steps

### Implementation Phase 1: Establish the product spine

- **GOAL-001**: Replace competing page-level treatments with shared product tokens and a consistent route frame.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `app/product-spine.css` and import it after existing visual styles in `app/layout.tsx`; define the light blue canvas, evidence-grid lines, ink hierarchy, status colors, shared radii, and focus treatment used by the redesigned surfaces. | ✅ | 2026-10-02 |
| TASK-002 | Add a compact route-purpose strip to the redesigned surfaces so users can see the product path: Discover, Inspect, Compare, Decide. | ✅ | 2026-10-02 |
| TASK-003 | Keep existing component contracts and page data loading intact; use CSS module classes or scoped route classes instead of broad destructive resets. | ✅ | 2026-10-02 |

### Implementation Phase 2: Rebuild the public entry and extension profile

- **GOAL-002**: Make the landing page and extension profile lead a person to an actionable exact-release review.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Refactor `app/home/AuthorityLanding.tsx` so the first viewport presents one decision statement, the extension search, a real product-film proof block, and a visible four-step product path without a generic right-side dashboard mockup. | ✅ | 2026-10-02 |
| TASK-005 | Add the asymmetric evidence-desk composition in `app/product-spine.css`, preserving the existing video, inventory board, free scans, and team workflow sections. | ✅ | 2026-10-02 |
| TASK-006 | Update `app/extensions/[id]/page.tsx` to promote the current release report, comparison action, install action, and decision summary in a product header; retain permissions, release history, README, and alternatives as supporting evidence. | ✅ | 2026-10-02 |
| TASK-007 | Add focused extension-profile styles in `app/product-spine.css` so the page reads as an inspectable package record instead of a long undifferentiated article. | ✅ | 2026-10-02 |

### Implementation Phase 3: Make comparison and reports product-grade

- **GOAL-003**: Turn version comparison and exact-release analysis into the core, visually coherent review workflow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Refactor `app/compare/page.tsx` into a two-release comparison workspace with explicit version selectors, aligned identity cards, decision deltas, and direct links to each exact report. | ✅ | 2026-10-02 |
| TASK-009 | Update `app/ExtensionDossier.tsx` and the report shell styles so the report opens with an executive decision, exact artifact identity, primary evidence counts, and a visible compare-release action before secondary sections. | ✅ | 2026-10-02 |
| TASK-010 | Keep the report rail, evidence sections, raw evidence, and intelligence report functional, but visually subordinate secondary navigation to the report's primary decision and evidence hierarchy. | ✅ | 2026-10-02 |
| TASK-011 | Update `app/extensions/[id]/versions/[version]/page.tsx` only as needed to make the public exact-version summary route point cleanly into the redesigned report flow. | ✅ | 2026-10-02 |

### Implementation Phase 4: Validate the critical path

- **GOAL-004**: Verify the redesigned product spine without publishing unreviewed production changes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Add or update focused surface tests for landing, extension profile, comparison, and report layout assumptions. | ✅ | 2026-10-02 |
| TASK-013 | Run `npx tsc --noEmit`, focused Vitest suites, `npm run build`, and `npm run lint` from the clean worktree. | ✅* | 2026-10-02 |
| TASK-014 | Run the local app and inspect `/`, a representative extension page, `/compare`, and a representative exact-release report at desktop and mobile widths; fix blocking layout or interaction regressions. | ✅* | 2026-10-02 |
| TASK-015 | Commit the implementation to a reviewable branch and wait for the user's approval before production deployment. | | |

`*` The clean worktree's source checks and direct `next build --webpack` completed successfully. The repository wrapper `npm run build` was blocked before compilation by its intentional Node 22 guard because this desktop runtime provides Node 26. The local browser preview covered `/`, a representative extension profile, and `/compare`; the authenticated report route remains protected, while its report-shell and action assumptions are covered by focused tests.

## 3. Alternatives

- **ALT-001**: Redesign every route in one pass. Rejected because it would increase regression risk and blur the primary product decision; the critical public flow should establish the system first.
- **ALT-002**: Keep the current report shell and only change colors. Rejected because the issue is hierarchy and task flow, not palette alone.
- **ALT-003**: Replace the real product film with a new decorative animation. Rejected because the existing demo is useful proof and should be framed better rather than discarded.

## 4. Dependencies

- **DEP-001**: Existing Next.js App Router pages, CSS modules, global visual styles, and `lucide-react` icons.
- **DEP-002**: Existing `getExtensionProduct`, `getVersionProduct`, report contract, scan actions, and exact-release route data.
- **DEP-003**: Existing demo assets under `public/demos/` and the current production build/deploy pipeline.

## 5. Files

- **FILE-001**: `app/layout.tsx` — load the shared product-spine styles.
- **FILE-002**: `app/product-spine.css` — shared critical-route design system and route-specific composition rules.
- **FILE-003**: `app/home/AuthorityLanding.tsx` — landing page narrative and primary proof arrangement.
- **FILE-004**: `app/home/authorityLanding.module.css` — landing layout and motion treatment adjustments.
- **FILE-005**: `app/extensions/[id]/page.tsx` — extension profile decision header and comparison affordance.
- **FILE-006**: `app/compare/page.tsx` — exact-release comparison workspace.
- **FILE-007**: `app/ExtensionDossier.tsx` — report hierarchy and primary actions.
- **FILE-008**: `app/dossier/reportShell.module.css` and `app/dossier/immutableReport.module.css` — report composition and identity surface.
- **FILE-009**: `app/extensions/[id]/versions/[version]/page.tsx` — exact-version summary handoff.
- **FILE-010**: `app/home/landingSurface.test.ts`, `app/extensions/extensionProductSurface.test.ts`, and report surface tests — regression coverage.

## 6. Testing

- **TEST-001**: `npx tsc --noEmit` exits successfully.
- **TEST-002**: Focused Vitest suites for landing, extension profile, comparison, and report surfaces pass.
- **TEST-003**: `npm run build` exits successfully from the clean worktree.
- **TEST-004**: `npm run lint` exits successfully or reports only pre-existing warnings with no new errors.
- **TEST-005**: The critical routes render without horizontal overflow at desktop and mobile widths, with visible primary actions and keyboard-visible focus states.
- **TEST-006**: Reduced-motion mode leaves the landing proof and report hierarchy understandable without animation.

## 7. Risks & Assumptions

- **RISK-001**: The existing CSS stack contains legacy selectors that may override the new spine; route-specific browser inspection is required after compilation.
- **RISK-002**: Comparison data currently exposes extension-level versions rather than a dedicated comparison contract; the UI must never imply an evidence-backed delta when exact scans are unavailable.
- **RISK-003**: The report is data-dense by nature; a visual simplification that hides provenance or evidence would damage trust.
- **ASSUMPTION-001**: The user wants a differentiated, editorial product interface with light blue as the base direction and visible evidence, not a marketing-only redesign.
- **ASSUMPTION-002**: Production deployment will happen only after the user reviews the local/preview result.

## 8. Related Specifications / Further Reading

[GuardRails evidence intelligence report plan](feature-evidence-intelligence-report-1.md)
[GuardRails light product site plan](design-light-product-site-1.md)
