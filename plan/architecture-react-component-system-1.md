# GuardRails UI architecture and Tailwind migration

**Status:** Proposed — implementation begins after this document is approved<br>
**Scope:** Every App Router page, the shared site shell, product surfaces, and the team workspace<br>
**Principle:** Migrate by owned vertical slices; do not add another global override layer.

## 1. Why this work exists

The application has a strong product foundation, but presentation responsibilities are spread across global styles, route modules, and one-off controls. The current root layout loads nine global style sheets. The workspace component is 3,441 lines, route modules contain both layout and component styling, and application code still renders many raw buttons and links.

The target is a cohesive, dark, high-contrast product interface inspired by Linear's clarity and motion discipline—not a visual clone. Tailwind v4 will own composition, canonical React primitives will own interaction styling, and route code will own only route-specific layout.

## 2. Non-goals

- Rewriting business logic, server actions, authentication, billing, or data fetching.
- Replacing semantic HTML with generic wrappers.
- Shipping a light-theme toggle in the first migration.
- Performing a mechanical class-name rewrite without visual, accessibility, and interaction coverage.
- Deleting legacy CSS before its consumers have moved.

## 3. Ownership model

| Concern | Canonical owner | May contain |
| --- | --- | --- |
| Design tokens | `app/styles/tokens.css` | Color, typography, spacing, radii, shadows, easing, z-index |
| Tailwind theme bridge | `app/styles/tailwind.css` | Tailwind import, `@theme` token aliases, base element defaults |
| Components | `app/ui/**` | Variants, states, accessibility behavior, component-local composition |
| Route styles | Route `.module.css` files during migration | Grid, placement, exceptional data visualizations only |
| Motion | Components plus `app/styles/motion.css` | Shared keyframes, reduced-motion behavior, view transitions |
| Legacy presentation | Existing global CSS files | Frozen compatibility rules awaiting deletion |

New visual rules must not be added to `globals.css`, `visual-refresh.css`, `authority.css`, or other legacy global layers. A migrated route must use tokens and shared components rather than append overrides.

## 4. Target foundation

### Tooling

- Tailwind CSS v4 with `@tailwindcss/postcss`, following the installed Next.js 16 App Router guide.
- `class-variance-authority` for typed component variants.
- `clsx` and `tailwind-merge` behind one `cn()` helper.
- Existing `motion` package for deliberate client-side interaction and layout motion.
- Existing Lucide icon set; icons never define button size or color themselves.

### Dark theme token families

Tokens use semantic names so product meaning survives a future palette change:

- Canvas: `canvas`, `canvas-raised`, `surface`, `surface-hover`, `surface-selected`.
- Borders: `border-subtle`, `border-default`, `border-strong`.
- Text: `text-primary`, `text-secondary`, `text-tertiary`, `text-inverse`.
- Brand: `accent`, `accent-hover`, `accent-muted`, `focus-ring`.
- Status: `success`, `warning`, `danger`, `info`, each with foreground and muted surface tokens.
- Elevation: `shadow-panel`, `shadow-dialog`, `shadow-command`.
- Motion: `duration-fast`, `duration-normal`, `ease-out`, `ease-spring`.

Contrast targets are WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and meaningful UI boundaries. Focus indication must remain visible on every surface.

### Canonical component API

1. `Button`: `primary | secondary | outline | ghost | danger`; `sm | md | lg`; link and native-button forms.
2. `IconButton`: the same intent model, required accessible label, optional tooltip.
3. `Badge`: neutral and semantic status variants.
4. `Surface`: `flat | raised | interactive`; optional padding and radius variants.
5. `PageHeader`: eyebrow, title, description, breadcrumbs, and action slot.
6. `Field`: label, description, error, and control association; input, textarea, and select adapters.
7. `Tabs`: roving keyboard focus, selected state, and optional URL-backed tabs.
8. `Dialog`: focus trap, escape/overlay close policy, labelled title and description, scroll lock.
9. `DataTable`: semantic table markup, loading/empty/error states, responsive overflow, sortable header primitive.
10. `StatePanel`: empty, loading, error, and permission-denied states.

Every component forwards refs where consumers need focus control, exposes `className` only for layout composition, and includes tests for keyboard and disabled/loading states.

## 5. Migration sequence

Each phase is a separate commit and remains deployable.

### Phase 0 — Baseline and guardrails

- Record CSS, raw-control, and workspace-size baselines in an executable audit script.
- Add lint/audit failures for new `!important` declarations and new unapproved global CSS imports.
- Add the token/component ownership rules to architecture documentation.
- Capture desktop and mobile screenshots for the home, registry, extension dossier, reports, and workspace routes.

**Exit:** CI can detect architectural regression before visual work begins.

### Phase 1 — Tailwind and canonical tokens

- Install and configure Tailwind v4 using the repository's bundled Next.js documentation.
- Add the semantic dark token sheet and Tailwind theme bridge.
- Set the document to dark color scheme and migrate only reset/base rules.
- Add `cn()` and variant utilities.

**Exit:** Tailwind utilities compile, no current route regresses, and tokens have contrast tests.

### Phase 2 — Shared primitives

- Rebuild `Button`, `Badge`, and `StatePanel` on the new foundation.
- Add `IconButton`, `Surface`, `PageHeader`, `Field`, `Tabs`, `Dialog`, and `DataTable`.
- Publish the states and variants on `/design-system`.
- Add component, keyboard, focus, reduced-motion, and visual tests.

**Exit:** Product routes need no custom CSS to recreate a primitive's appearance.

### Phase 3 — Site shell and marketing routes

- Migrate header, navigation popovers, account menu, footer, cookie consent, and feedback UI.
- Migrate home and the shared marketing/company shells.
- Consolidate repeated marketing patterns into section, feature-card, proof-strip, and CTA compositions.
- Remove superseded rules from global layers in the same commit that removes their consumers.

**Exit:** All public marketing routes use the dark shell, shared primitives, and responsive composition utilities.

### Phase 4 — Core product journey

- Migrate analyze, registry, search, dossier, extension/version/scan views, compare, diff, and public scan.
- Standardize query/filter toolbars, evidence cards, severity presentation, loading states, and data tables.
- Preserve URL state, server/client boundaries, and existing analytics events.

**Exit:** A user can search, inspect, compare, and share an extension without entering legacy presentation code.

### Phase 5 — Reports and monitoring

- Migrate reports, detections, monitor, history, alerts, metrics, settings, and account surfaces.
- Replace route-specific dialogs, fields, tabs, and tables with canonical components.
- Validate dense-data behavior at 320, 768, 1024, and 1440 pixel widths.

**Exit:** Operational product surfaces have consistent navigation, density, state, and keyboard behavior.

### Phase 6 — Workspace decomposition

Split `TeamWorkspace.tsx` by capability, keeping server/data boundaries explicit:

```text
app/workspace/
  WorkspaceShell.tsx
  WorkspaceNavigation.tsx
  views/
    OverviewView.tsx
    InventoryView.tsx
    DecisionsView.tsx
    PoliciesView.tsx
    NotificationsView.tsx
    BillingView.tsx
  hooks/
    useWorkspaceFilters.ts
    useWorkspaceSelection.ts
  model/
    workspace.types.ts
    workspace.selectors.ts
```

- Extract pure selectors and transformations before extracting JSX.
- Move one view at a time with characterization tests.
- Keep view modules below 400 lines unless a documented exception is warranted.

**Exit:** Workspace views are independently renderable and testable; the shell coordinates rather than implements every capability.

### Phase 7 — Legacy deletion and enforcement

- Delete unused selectors and collapse the nine root CSS imports to the token/Tailwind entry plus exceptional third-party styles.
- Remove all avoidable `!important` declarations.
- Restrict CSS Modules to layout and exceptional visualization styles.
- Fail CI on orphaned CSS modules, unapproved raw controls, token literals in components, and new global layers.

**Exit:** There is one style entry, one token vocabulary, one component foundation, and measurable enforcement against drift.

## 6. Validation matrix

Every migrated slice must pass:

- `npm run lint`
- `npm test`
- `npm run build`
- Playwright smoke coverage at desktop and mobile widths.
- Axe scans with no serious or critical violations.
- Keyboard-only navigation through menus, tabs, dialogs, tables, and forms.
- `prefers-reduced-motion: reduce` verification.
- Screenshot comparison in Chromium for affected routes.
- Dark native controls and autofill checks in Chromium, Firefox, and WebKit where CI supports them.

## 7. Commit and review policy

- One phase or coherent vertical slice per commit; never mix unrelated business changes into migration commits.
- A component migration commit deletes the legacy rules it replaces.
- Pull-request descriptions list migrated routes, deleted legacy selectors, screenshots, accessibility results, and remaining compatibility styles.
- Large generated formatting diffs are rejected. Reviewable semantic diffs take priority over migration speed.

## 8. Success metrics

- Root global style imports: nine to two or fewer.
- Avoidable `!important`: to zero.
- Raw interactive controls: zero unless documented as a semantic exception.
- Shared component adoption: 100% on migrated routes.
- `TeamWorkspace.tsx`: replaced by a coordinating shell below 400 lines.
- Serious/critical axe violations: zero on the validation route set.
- No horizontal overflow at supported widths.
- No material regression in build output size or Core Web Vitals.

## 9. First implementation pull request

After approval, the first code PR will contain Phases 0–2 only: audit guardrails, Tailwind v4, semantic dark tokens, the canonical component foundation, and the design-system route. It will not restyle product routes. That boundary makes the foundation reviewable before dozens of routes depend on it; subsequent PRs will migrate vertical slices and delete legacy CSS as they go.
