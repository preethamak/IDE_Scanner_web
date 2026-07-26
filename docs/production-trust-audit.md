# IDE Scanner production-trust audit

## Release decision

The validated 30-report release is active in production. Its deep-profile replay,
stored website reports, and CLI Deep Scan produce the same canonical extension
result for identical immutable inputs.

No classification thresholds or extension-specific outcomes were changed to reach a
target distribution. The observed current cohort is 18 allow, 11 review, and 1 block.
The additional reviews relative to an offline scan come from captured, replayable
dependency intelligence.

## Canonical invariants

1. Identity is registry, extension ID, version, target platform, artifact SHA-256,
   scanner build, ruleset, score schema, advisory snapshot, and provider rules.
2. Severity describes actionable security evidence. Capabilities remain separate and
   do not independently create a security verdict.
3. Decision is derived from actionable evidence and policy. Incomplete analysis can
   never produce allow or review, while an already-proved enforceable block remains a
   block.
4. File coverage and required-provider completion are separate. Complete means every
   required provider completed.
5. CLI JSON, callback ingestion, database rows, APIs, and pages render canonical
   scanner fields rather than reclassifying reports.
6. Publication is transactional, idempotent, immutable, and explicitly activated
   from an exact release manifest.
7. Historical reports remain stored, but only scans in the active release are listed
   in the public registry.
8. Marketplace acquisition is version- and target-platform-qualified. A qualified
   request never falls back to a different registry artifact.

## Root causes corrected

- The production outage was caused by application code reading publication tables
  before their migrations existed. All linked migrations are now applied and the
  production schema linter reports no errors.
- Completion, coverage, and evidence had been independently interpreted across
  layers. The scanner now owns those semantics and database/UI contracts enforce
  them.
- Provider timeouts on broad generated trees caused misleading incomplete reports.
  Providers now consume the bounded canonical target manifest.
- Raw YARA byte markers were overclaimed as executable structure. Structural claims
  now require validation; non-proving matches remain informational.
- Callback ingestion used multiple non-atomic writes. Canonical ingestion and job
  lifecycle transitions now use transactional, idempotent database functions.
- Exact Marketplace versions can contain multiple platform artifacts. The acquisition
  contract and frozen corpus now pin target platform as well as version and hash.
- Analyzer dependency ranges allowed runtime drift. Semgrep 1.164.0 and yara-python
  4.5.4 are pinned, and publication verifies their versions and rule hashes.
- The benchmark API exposed an obsolete 26-review study. Static outcome data was
  removed; current outcomes resolve only from immutable canonical scan rows.

## Verification evidence

- Core scanner: 204 tests passed from a clean worktree at build
  `33ed46d94ad72e9a4478205e72ee166d8599f374`.
- Guardrails CLI: 46 tests and 5 subtests passed; its vendored engine is the same core
  build. The current wheel contains the engine, Semgrep rules, and YARA rules and has
  no `guardrails-core` dependency.
- Website: 78 tests and 17 browser tests passed; TypeScript, ESLint (zero errors),
  and the production Next.js build passed. Two existing image-optimization warnings
  remain non-blocking.
- Database: every local migration exists remotely and linked schema lint reports zero
  errors.
- Frozen cohort: 30 exact artifacts, all complete, with 18 allow, 11 review, 1 block;
  severities are 10 informational, 13 low, and 7 high.
- Reproducibility: two scanner builds produced an exact normalized match when build
  identity, timestamps, install paths, and provider filesystem paths were excluded.
- CLI parity: core and packaged CLI Deep Scan produced an exact normalized canonical
  extension payload for Error Lens using the same artifact and captured intelligence.
- Python target-platform control: the frozen darwin-x64 artifact remained
  `7edf45e8e93fd155373fdf80000c56e75344e519442ba570b453da318abe18b8`;
  observed alpine variants were rejected rather than substituted.

## Release components

- Core scanner: `33ed46d94ad72e9a4478205e72ee166d8599f374`
- Guardrails CLI: `42c4609d9e82d1d966e7c99b6991155e9b4a2cac`
- Website behavior: `cf75704`
- Ruleset: `2026.07.24-policy-v3-calibration.6`

## Production activation

The publication dry run validated all 30 exact reports before release
`faf713ea-12cc-4d40-ac9d-a170a6fc3113` was activated. The public registry now lists
exactly those 30 reports from core build `33ed46d`, with 18 allow, 11 review, and
1 block. The benchmark API exposes no obsolete static outcome or publication-date
fields. Browser validation opened the registry and an immutable Code Runner report;
the report retained the canonical authoritative-vulnerability block reason.
