# Launch Recovery Checklist

This checklist is the implementation gate for the Extension Registry release. A checked item requires passing automated evidence and a committed change.

## Product language and routes

- [ ] Extension Registry is the only customer name for the completed public scan collection.
- [ ] Analyze is the only customer entry point for selecting or uploading an artifact.
- [ ] Deep Scan is the only customer name for the asynchronous exact-artifact analysis operation.
- [ ] Analysis Report is the only customer name for a completed result; “Dossier” is internal-only.
- [ ] `/registry` and `/analyze` are canonical; legacy route redirects preserve valid query strings.
- [ ] Primary navigation contains Registry, Analyze, Monitor, CLI, and Trust & docs only.

## Deep Scan operation

- [ ] The availability response distinguishes authentication, accepting/delayed runner, configuration failure, dispatch failure, queued, running, completed, and incomplete states.
- [ ] A signed-in customer can submit a controlled test Deep Scan in the production-like environment.
- [ ] Every unavailable message is specific, safe, and never says a job exists when none was created.
- [ ] A completed job links to its exact Analysis Report.

## Workspace

- [ ] Auth/session loading has a terminal success, signed-out, or recoverable-error state; it never spins indefinitely.
- [ ] Team loading, creation, watches, decisions, invites, preferences, and notification channels report actionable failures and offer retry.
- [ ] A new signed-in user can create a team and see it immediately.
- [ ] Workspace API authorization and cross-team isolation remain covered by tests.

## Design system

- [ ] Lime, white, and dark text are the only default product palette; blue is not introduced as a new brand/action color.
- [ ] One token source owns canvas, text, borders, lime primary actions, focus, disabled, and semantic status colors.
- [ ] Primary actions are lime with dark text; secondary actions are white with dark border/text; dark fills are limited to code/source views.
- [ ] `visual-refresh.css` contains no global catch-all control overrides before it is removed.
- [ ] Desktop and mobile screenshots show no clipped controls, unintentional dark buttons, or color drift.

## Release proof

- [ ] Unit tests, lint, build, end-to-end journeys, axe checks, visual snapshots, and launch readiness pass.
- [ ] Product tester charter is complete and issues are captured with steps and screenshots.
- [ ] Each completed phase is committed separately with its verification command in the commit message or accompanying release evidence.
