# Delivery roadmap

## Phase 0 — Security contract and prototype (current)

**Goal:** make the product promise testable before building an editor shell.

- Publish threat model, trust boundaries, capability schema, and acceptance criteria.
- Implement deterministic policy evaluation and adversarial unit tests.
- Build a control-plane preview that explains grants, denials, prompts, and audit events.
- Establish secure defaults and policy-versioning conventions.

**Exit:** all Phase 0 acceptance tests pass; UI never labels the prototype as an OS sandbox.

## Phase 1 — Local secure workspace MVP

**Goal:** edit a repository while one sample extension and one agent operate through brokers.

- Desktop shell with Monaco-compatible editing, file tree, search, source control, and terminal UI.
- Native supervisor and per-principal sandbox on one reference OS (Linux first).
- Filesystem, structured-command, egress, credential, and audit brokers.
- Permission center with once/session/workspace grants and exact-action approvals.
- Agent plan/review/apply workflow with patch-only writes by default.

**Exit:** red-team suite cannot read host secrets, escape workspace mounts, make undeclared network calls, or execute unapproved commands.

## Phase 2 — Extension and agent ecosystem

**Goal:** useful compatibility without ambient authority.

- Capability manifest format, signing, publisher identity, and update diffs.
- VS Code API adapter for high-value extension categories.
- Isolated language-server and debugger protocols.
- MCP/tool registry with per-tool grants and delegation-chain visibility.
- Extension static/dynamic analysis integrated with the existing scanner intelligence.

**Exit:** curated extension set passes functional and security conformance suites.

## Phase 3 — Team policy and remote execution

**Goal:** centrally governed development environments.

- Organization policy bundles and locked deny rules.
- Remote ephemeral workspaces with attested images.
- SSO, device posture, audit export, policy simulation, and incident revocation.
- Secret-provider integrations using workload identity and short-lived credentials.

**Exit:** enterprise pilot demonstrates policy enforcement and auditable incident response.

## Phase 4 — Cross-platform hardening and public beta

**Goal:** production-quality Linux, macOS, and Windows isolation.

- Platform sandbox parity and conformance testing.
- Reproducible builds, signed updates, SBOM/provenance, and rollback protection.
- Independent penetration test and threat-model review.
- Performance, accessibility, recovery, and migration hardening.

**Exit:** no unresolved critical findings; documented residual risks; beta support runbooks ready.

## Suggested first twelve weeks

| Weeks | Deliverable |
| --- | --- |
| 1–2 | Policy contract, evaluator, test corpus, and control-plane prototype |
| 3–4 | Rust/native supervisor spike and broker IPC protocol |
| 5–6 | Filesystem sandbox and canonical-path escape suite |
| 7–8 | Command runner, network proxy, and resource limits |
| 9–10 | Opaque credential flow and secret-leak regression suite |
| 11–12 | Agent patch workflow, approval binding, audit chain, and internal demo |

Do not begin broad extension compatibility until the native isolation conformance suite passes on the reference platform.
