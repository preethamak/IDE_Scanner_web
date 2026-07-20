# IDE Scanner product and launch roadmap

Updated: 20 July 2026

## Product position

IDE Scanner is exact-artifact intelligence for IDE extensions. It should answer three separate questions without conflating them:

1. What exact bytes were scanned, and was analysis complete?
2. What power and security-relevant behavior does the artifact contain?
3. Is there authoritative evidence of malicious intent, or is the result a capability-based review?

The malware score is reserved for authoritative threat intelligence or high-specificity observed proof. Capability risk, dependency risk, and ambiguous static evidence remain visible in the investigation-priority score and evidence groups.

## Foundation completed

- One canonical Python engine and schema-v2 report contract powers CLI, GitHub workers, registry intelligence, exact Deep Scan pages, and benchmark evidence.
- The browser-hosted static scanner is retired from decision-producing paths.
- Every public result requires an exact extension ID, version, SHA-256, scanner build, ruleset, and complete required-provider coverage.
- Acquisition or analyzer failure produces `INCOMPLETE`; it cannot produce a clean verdict.
- Public catalog and benchmark rows reopen immutable stored scans rather than mutable “latest” evidence.
- The frozen 30-extension legitimate corpus is published with 30/30 hash, coverage, schema, and expected-decision validation.
- Scheduled catalog refreshes now require a current-build schema-v2 result instead of trusting a stale `complete` flag.

## Milestone 1 — precision and evidence quality

Target: August 2026

- Add resolved dependency provenance from packaged lockfiles, SBOMs, and bundled-module attribution; range-only advisories stay contextual.
- Add reachability evidence for dependency and dangerous-API findings.
- Add signed-release and reproducible-build evidence for native and packed artifacts.
- Validate YARA and static rules against file-type-aware negative controls so images, JAR resources, generated bundles, and security rule content do not inflate decisions.
- Expand version-differential tests with independently preserved clean and malicious artifacts.
- Publish per-rule precision, corpus coverage, false-block rate, and unresolved-label counts. Do not publish ecosystem-wide accuracy claims until the holdout supports them.

Exit gates:

- 100% required-provider completion for published rows.
- Zero clean verdicts on incomplete acquisitions or analyzer failures.
- Zero false blocks in the legitimate holdout.
- Every `BLOCK` cites authoritative intelligence, observed proof, or a documented high-specificity abuse chain.

## Milestone 2 — one scanner in every workflow

Target: September 2026

- Stabilize the schema-v2 JSON contract and publish compatibility guarantees.
- Add first-class SARIF and policy-exit output for CI while preserving the canonical JSON bundle as the source of truth.
- Add CLI commands for exact Marketplace versions, local VSIX files, installed extensions, and report verification.
- Add organization policy files for allowed capabilities, approved publishers, hash pins, exceptions, and expiration dates.
- Add signed report bundles so a website or CI consumer can verify artifact hash, engine build, and result integrity offline.
- Keep website and CLI parity in CI with golden-contract tests over the same exact artifacts.

Exit gates:

- Identical decision, severity, malware score, risk score, coverage, and evidence IDs across CLI, worker, API, registry, and benchmark for a pinned artifact/build.
- Backward-compatible schema handling for one documented support window.
- Reproducible installation and scanning documentation for Linux, macOS, Windows, and CI.

## Milestone 3 — team product pilot

Target: October–November 2026

- Team inventory of installed extensions and versions without collecting source code.
- Watchlists for publisher, version, hash, permission, and capability changes.
- Approval workflows with evidence-linked exceptions, owners, reasons, and expiry.
- Alerts for new releases, hash changes, removed Marketplace packages, new authoritative intelligence, and material behavior deltas.
- Exportable audit history for security review and procurement.

Pilot audience:

- Five to ten design partners with extension governance pain: security teams, regulated engineering organizations, and companies deploying AI coding agents.
- Start with a read-only inventory and evidence review. Add enforcement only after each partner agrees that the decision language and exception workflow match how its teams work.

Success criteria:

- Security reviewers can reproduce a result from its immutable report without developer assistance.
- Developers can distinguish “powerful but expected” from “unexplained” and “confirmed threat” in one pass.
- Median triage time and unnecessary extension removals decrease during the pilot.

## Milestone 4 — public launch

Target: December 2026, contingent on the precision gates

- Launch the free exact-artifact catalog and CLI together, backed by the same reports.
- Publish methodology, known limitations, corpus manifests, hashes, and regression results before making broad accuracy claims.
- Release evidence-led case studies from consenting design partners.
- Offer a paid team tier for continuous inventory, policy, alerts, approvals, retention, and audit exports.

Launch message:

> Know exactly what an IDE extension can do, what evidence supports the decision, and whether the scan actually completed.

Avoid “AI antivirus” and probability-of-malware positioning. The durable advantage is reproducible artifact identity, explainable evidence, honest uncertainty, and consistent decisions everywhere the report appears.
