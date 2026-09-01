---
goal: Establish a lighter, readable button system across GuardRails
version: 1.0
date_created: 2026-09-01
last_updated: 2026-09-01
owner: GuardRails product engineering
status: 'Completed'
tags: [design, accessibility, bug, refactor, responsive]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan removes the remaining button-label visibility failures and establishes one light, accessible interaction language for the report library, report dashboard, report detail, shared chrome, and the rest of the product. The implementation must keep surfaces light, avoid dark green, avoid decorative AI-slop patterns, and preserve clear focus and disabled states.

## 1. Requirements & Constraints

- **REQ-001**: Every visible button and button-like link must have readable text in default, hover, focus-visible, disabled, loading, open, and error states.
- **REQ-002**: Normal-size text controls must meet WCAG AA contrast of at least 4.5:1; large text may meet 3:1 only when the control typography qualifies as large text.
- **REQ-003**: The default visual language must use light surfaces and light peach/terracotta accents; no dark-green background or hover treatment may remain in the active product UI.
- **REQ-004**: Report routes must distinguish loading, missing, and populated browser-local data without showing a false “not found” state during hydration.
- **REQ-005**: Mobile controls must remain visible above the consent banner, fit their available width, and preserve keyboard focus visibility.
- **REQ-006**: Shared button styles must be token-driven so component and route styles cannot silently reintroduce invisible labels.
- **SEC-001**: Do not weaken production CSP or add unsafe runtime evaluation to solve visual issues.
- **CON-001**: Preserve unrelated worktree changes in `AGENTS.md` and `image copy.png`.
- **CON-002**: Preserve report semantics and existing navigation destinations while changing presentation and loading feedback.
- **GUD-001**: Prefer calm, evidence-led UI over gradients, fake cursors, autoplay, decorative motion, or generic AI-generated visual motifs.
- **GUD-002**: Use CSS transitions only for state feedback; honor `prefers-reduced-motion`.
- **PAT-001**: Use `--ledger-*` tokens from `app/authority.css` as the source of truth for light surfaces, text, borders, focus rings, and signal states.
- **PAT-002**: Keep icons supplementary; every meaningful action must remain understandable from its text or accessible name.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Inventory every interactive control and define the final light palette before changing route styles.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Build a selector inventory from `app/**/*.tsx`, `app/**/*.css`, `app/ui/Button.tsx`, `app/ui/primitives.module.css`, and `app/FeedbackWidget.tsx`; classify each control as primary, secondary, quiet, destructive, consent, navigation, or icon-only. | ✅ | 2026-09-01 |
| TASK-002 | Record the current computed foreground, effective background, border, focus ring, z-index, and viewport position for controls on `/reports`, `/reports/<id>`, `/reports/<id>/posture`, `/reports/<id>/extensions/<extensionId>`, `/scan`, `/registry`, and shared footer/chrome at 375px, 414px, 768px, and 1280px. | ✅ | 2026-09-01 |
| TASK-003 | Define final tokens in `app/authority.css`: `--ledger-signal`, `--ledger-signal-soft`, `--ledger-signal-hover`, `--ledger-signal-strong`, `--ledger-ink`, `--ledger-ink-2`, and `--ledger-focus`; verify each text/background pair mathematically before use. | ✅ | 2026-09-01 |

### Implementation Phase 2

- GOAL-002: Repair the cascade and migrate all shared controls to the light token system.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Update the global cascade in `app/visual-refresh.css` and `app/authority.css` so generic `button` rules do not override component-specific label colours with an unrelated `!important`; retain explicit input/select/textarea text rules. | ✅ | 2026-09-01 |
| TASK-005 | Update `app/ui/primitives.module.css` and `app/ui/Button.tsx` so primary, secondary, quiet, danger, loading, disabled, and focus-visible states use explicit readable colours and accessible names. | ✅ | 2026-09-01 |
| TASK-006 | Update `app/companyChrome.module.css`, `app/FeedbackWidget.tsx`, `app/FooterNewsletter.tsx`, and `app/CookieConsent.tsx` so `Feedback`, `Close`, `Send feedback`, `Subscribe`, `Allow analytics`, and `Continue without` remain readable and do not collide with mobile consent UI. | ✅ | 2026-09-01 |
| TASK-007 | Migrate route-specific controls in `app/globals.css`, `app/reports/reports.module.css`, `app/monitor/monitor.module.css`, `app/benchmark/benchmark.module.css`, and relevant product CSS to the shared tokens; remove active dark-green and dark-filled fallback styles where they conflict with the light system. | ✅ | 2026-09-01 |
| TASK-008 | Add explicit `:focus-visible`, `:hover`, `:active`, and `:disabled` rules for links styled as buttons and buttons styled as links; ensure focus rings are visible on both white and peach surfaces. | ✅ | 2026-09-01 |

### Implementation Phase 3

- GOAL-003: Make report hydration and responsive interaction states honest and testable.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Keep explicit loading states in `app/reports/[id]/page.tsx`, `app/reports/[id]/posture/page.tsx`, and `app/reports/[id]/extensions/[extensionId]/page.tsx`; ensure the ready flag is set only after route parameters and local storage have been read. | ✅ | 2026-09-01 |
| TASK-010 | Verify the report dashboard table and filters in `app/reports/[id]/page.tsx` at mobile widths; retain intentional table scrolling without document-level horizontal overflow or clipped action labels. | ✅ | 2026-09-01 |
| TASK-011 | Verify `app/companyChrome.module.css` mobile launcher placement against the consent banner and feedback dialog stacking order; ensure only the intended overlay receives pointer events. | ✅ | 2026-09-01 |

### Implementation Phase 4

- GOAL-004: Add regression coverage and complete browser verification.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Extend `app/reports/reportsSurface.test.ts` and add focused tests for shared button tokens, absence of dark-green active styles, loading-state markup, and accessible action labels. | ✅ | 2026-09-01 |
| TASK-013 | Add or extend Playwright coverage under `tests/` for populated and empty report fixtures, feedback open/close, consent actions, filters, mobile widths, and focus-visible states. | ✅ | 2026-09-01 |
| TASK-014 | Run a browser contrast audit that computes effective opaque ancestor backgrounds and fails for any visible text control below 4.5:1; record desktop and mobile screenshots for `/reports` and report detail. | ✅ | 2026-09-01 |
| TASK-015 | Run `npm test`, targeted and full ESLint, `npm run build`, and a production browser pass; confirm no Next dev overlay, eval error, console error, or failed report route remains. | ✅ | 2026-09-01 |
| TASK-016 | Review `git diff --check`, stage only intended files, commit with a descriptive message, push `main`, and confirm `HEAD` equals `origin/main` while preserving unrelated local changes. | ✅ | 2026-09-01 |

## 3. Alternatives

- **ALT-001**: Keep dark filled buttons with white text everywhere. Rejected because the user explicitly requested lighter colours and the current product direction uses light surfaces.
- **ALT-002**: Patch only the two currently failing selectors. Rejected because the global cascade and route-specific styles can reintroduce the same invisible-label defect elsewhere.
- **ALT-003**: Add motion-heavy visual effects from animation libraries to make controls feel less generic. Rejected because motion does not solve contrast or information hierarchy and risks recreating the AI-slop patterns already removed.
- **ALT-004**: Remove all icons from controls. Rejected because icons can support scanning when they remain supplementary to visible text and accessible names.

## 4. Dependencies

- **DEP-001**: Existing CSS token layers in `app/authority.css`, `app/visual-refresh.css`, `app/globals.css`, and component CSS modules.
- **DEP-002**: React 19 and Next.js 16 client hydration for browser-local report state.
- **DEP-003**: Vitest, ESLint, Next production build, and the T3 collaborative preview browser for verification.
- **DEP-004**: Existing report fixture data in browser `localStorage`; test fixtures must not be committed as production data.

## 5. Files

- **FILE-001**: `app/authority.css` — final light design tokens, shared action states, readable report navigation.
- **FILE-002**: `app/visual-refresh.css` — global cascade repair for button and form colours.
- **FILE-003**: `app/globals.css` — legacy route fallback and responsive control rules.
- **FILE-004**: `app/ui/Button.tsx` and `app/ui/primitives.module.css` — shared button primitive states.
- **FILE-005**: `app/companyChrome.module.css`, `app/FeedbackWidget.tsx`, `app/FooterNewsletter.tsx`, `app/CookieConsent.tsx` — shared chrome controls and overlays.
- **FILE-006**: `app/reports/page.tsx`, `app/reports/[id]/page.tsx`, `app/reports/[id]/posture/page.tsx`, `app/reports/[id]/extensions/[extensionId]/page.tsx`, and `app/reports/reports.module.css` — report states and controls.
- **FILE-007**: `app/reports/reportsSurface.test.ts` and `tests/` — automated regression coverage.

## 6. Testing

- **TEST-001**: Verify every report control has an accessible name and visible text where the action is meaningful.
- **TEST-002**: Verify computed effective contrast for visible controls at 375px, 414px, 768px, and 1280px; fail below 4.5:1 for normal text.
- **TEST-003**: Verify hover, focus-visible, active, disabled, loading, feedback-open, and consent-visible states without dark-green backgrounds.
- **TEST-004**: Verify direct report, posture, and extension-detail loads show “Opening report…” until browser-local data is ready, then show either populated or missing state.
- **TEST-005**: Verify mobile feedback is not covered by the consent banner and does not create document-level horizontal overflow.
- **TEST-006**: Verify `npm test`, ESLint, `npm run build`, and production browser routes complete without runtime or console errors.

## 7. Risks & Assumptions

- **RISK-001**: Changing shared tokens can alter legacy pages that still rely on old dark-theme selectors; mitigate with the selector inventory and full route browser pass.
- **RISK-002**: Removing a broad `!important` button colour may expose browser-default colours in unclassified controls; mitigate by auditing every remaining button and adding explicit component states.
- **RISK-003**: Moving the mobile feedback launcher can compete with content on very short viewports; mitigate by testing 320px-high and 896px-high mobile layouts.
- **RISK-004**: Browser-local report fixtures can diverge from actual scanner bundle schemas; keep route tests focused on rendering contracts and use parse/validation tests for bundle shape.
- **ASSUMPTION-001**: “A bit lighter” means light peach/cream backgrounds with sufficiently dark terracotta or ink text, not low-contrast pastel text.
- **ASSUMPTION-002**: The existing production CSP and analytics integration remain unchanged while visual controls are repaired.

## 8. Related Specifications / Further Reading

- Existing plan: `plan/design-light-product-site-1.md`
- WCAG 2.2 contrast guidance: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 focus-visible guidance: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
