---
goal: Replace the rejected Authority Ledger direction with a light, motion-led GuardRails product site
version: 1.0
date_created: 2026-08-20
last_updated: 2026-08-20
owner: GuardRails
status: Planned
tags: [design, website, marketing, product-ui]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Replace the dark Authority Ledger treatment with a calm light interface. The primary proof is a short, silent product interaction that explains a release review without reading a wall of copy.

## 1. Requirements & Constraints

- **REQ-001**: Use a light page canvas, white product surfaces, black/charcoal type, and a restrained lilac-to-coral accent field.
- **REQ-002**: Make the homepage hero understandable within five seconds through an animated release-review product surface.
- **REQ-003**: Keep copy short: one outcome-led headline, one supporting sentence, one primary CTA, and one secondary CTA in the first viewport.
- **REQ-004**: Apply the same visual tokens and component rules to pricing, solutions, registry, CLI, monitoring, reports, workspace, security, privacy, and status.
- **REQ-005**: Preserve all existing routes, product claims, forms, and application behavior.
- **CON-001**: Do not use a dark full-page treatment, faux enterprise seals, generic shield illustrations, or more than one prominent accent action per section.
- **CON-002**: Do not commit generated media unless it is explicitly force-added and verified as present in the deployed build.
- **GUD-001**: Follow Strawberry Browser's light canvas, focused product moments, and progressive task story; use Raycast's crisp type hierarchy and compact interaction density as inspiration only.
- **GUD-002**: Respect `prefers-reduced-motion`; all product motion must have a static useful final state.

## 2. Implementation Steps

### Implementation Phase 1: Establish the replacement visual language

- GOAL-001: Define a light, compact system that replaces the Authority Ledger visual tokens without changing route behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Replace the token declarations and global overrides in `app/authority.css` with `--light-canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--violet`, `--coral`, and `--aqua`; remove full-page dark panel rules. |  |  |
| TASK-002 | Update global header, footer, buttons, chips, and focus states in `app/authority.css` to use white surfaces, dark text, 12px to 16px radii, and one dark primary CTA. |  |  |
| TASK-003 | Update `app/layout.tsx` only if stylesheet import order prevents the new system from overriding the rejected treatment. |  |  |

### Implementation Phase 2: Rebuild the homepage around a product moment

- GOAL-002: Make the homepage tell one clear story: a new extension asks for additional authority, GuardRails shows the change, and a person decides.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Replace the JSX in `app/home/AuthorityLanding.tsx` with a light hero containing one headline, one sentence, two actions, and a single `ReleaseReviewMotion` visual component. |  |  |
| TASK-005 | Replace `app/home/authorityLanding.module.css` with responsive styles for an airy two-column hero, soft lilac/coral/aqua background shapes, and a white product-window surface. |  |  |
| TASK-006 | Build the silent 5-second product loop in `ReleaseReviewMotion` with CSS: capability row appears, cursor selects it, approval state resolves, and the exact package receipt appears. |  |  |
| TASK-007 | Add a reduced-motion static frame and ensure the product window remains readable at 320px width. |  |  |
| TASK-008 | Keep `app/demos/page.tsx` as a separate pitch/demo route; do not place a video gallery in the homepage hero. |  |  |

### Implementation Phase 3: Apply the system to public product pages

- GOAL-003: Make all public marketing and product-explainer pages feel related without repeating the hero composition.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Replace Authority Ledger overrides in `app/marketing.module.css`, `app/registry/registry.module.css`, and `app/cli/cli.css` with light surface, compact-card, and motion-preview rules. |  |  |
| TASK-010 | Replace Authority Ledger overrides in `app/trust.module.css`, `app/status/status.module.css`, `app/monitor/monitor.module.css`, and `app/reports/reports.module.css` with the light system. |  |  |
| TASK-011 | Update `app/workspace/workspace.module.css` so the authenticated workspace uses the same base colors while retaining its information-dense layout. |  |  |
| TASK-012 | Add route-specific visual proof: pricing gets plan comparison clarity, CLI gets terminal motion, registry gets search-to-result motion, and monitoring gets a compact changed-release timeline. |  |  |

### Implementation Phase 4: Verify the result before release

- GOAL-004: Validate the visual result in a real browser and publish only after user approval.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Run `npx tsc --noEmit`, `npm run build`, and the focused surface tests for home, monitor, reports, and workspace. |  |  |
| TASK-014 | Capture desktop and mobile browser screenshots for `/`, `/pricing`, `/registry`, `/cli`, `/monitor`, `/security`, and `/status`; review hierarchy, color restraint, overflow, and motion fallback. |  |  |
| TASK-015 | Commit each completed phase separately and provide a local preview link. Do not deploy production until the user explicitly approves the replacement design. |  |  |

## 3. Alternatives

- **ALT-001**: Restore the original pink-gradient homepage unchanged. Rejected because it does not solve the user's concern about text-heavy sections and product understanding.
- **ALT-002**: Keep the Authority Ledger system and only lighten its colors. Rejected because the problem is the visual concept and density, not only the palette.

## 4. Dependencies

- **DEP-001**: Existing `motion` package for optional animation enhancements; CSS animation remains the baseline implementation.
- **DEP-002**: Existing demo MP4 files under `public/demos/`; their Git-ignore and deployment handling must be resolved before embedding them in a production page.

## 5. Files

- **FILE-001**: `app/authority.css` — shared light visual tokens and global component rules.
- **FILE-002**: `app/home/AuthorityLanding.tsx` — homepage narrative and product-motion markup.
- **FILE-003**: `app/home/authorityLanding.module.css` — homepage composition and animation.
- **FILE-004**: `app/marketing.module.css`, `app/registry/registry.module.css`, `app/cli/cli.css` — public product-page styling.
- **FILE-005**: `app/trust.module.css`, `app/status/status.module.css`, `app/monitor/monitor.module.css`, `app/reports/reports.module.css`, `app/workspace/workspace.module.css` — trust and application styling.

## 6. Testing

- **TEST-001**: `npx tsc --noEmit` exits with status 0.
- **TEST-002**: `npm run build` exits with status 0.
- **TEST-003**: Browser review shows the homepage hero and product interaction without horizontal overflow at desktop and mobile widths.
- **TEST-004**: With reduced motion enabled, the homepage product visual remains legible and its final approval state is visible.

## 7. Risks & Assumptions

- **RISK-001**: Existing module CSS has legacy color declarations that can override shared tokens; each public route must be browser-checked after its CSS is changed.
- **RISK-002**: A locally running server can serve a stale `.next` build; preview validation must use a fresh build or live development server.
- **ASSUMPTION-001**: The user wants a bright, modern software-product aesthetic and silent, product-native animation—not a literal copy of Strawberry Browser.

## 8. Related Specifications / Further Reading

[Strawberry Browser](https://strawberrybrowser.com/)
[Raycast](https://www.raycast.com/)
