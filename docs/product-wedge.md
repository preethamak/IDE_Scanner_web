# GuardRails product wedge

GuardRails is not another extension risk score.

The product is an enterprise extension control plane: it answers whether a
specific extension artifact may enter a developer environment, who approved it,
what changed since approval, and whether the local editor is enforcing that
decision.

## Customer

The first buyer is the security, platform, or developer-experience owner who
must control extensions across VS Code, Cursor, Windsurf, VSCodium, and future
GuardRails IDE clients without becoming the bottleneck for every developer.

## The customer job

> Approve a useful extension once, pin the exact release, understand its real
> authority, detect risky updates, and prevent unapproved versions from running.

This is a stronger job than “show me a score.” A score is an input. The product
must produce an enforceable decision and an audit receipt.

## The control-plane loop

```text
device inventory
      -> exact artifact acquisition and analysis
      -> capability declaration and evidence review
      -> team approval receipt bound to version + SHA-256
      -> generated deny-by-default policy
      -> editor / CLI enforcement
      -> release diff and automatic re-review
      -> runtime observations and revocation
```

The first deployable slice is the enterprise policy bundle exported by
`/api/teams/:id/policy-bundle`. It produces a VS Code-compatible version
allowlist and a GuardRails exact-release allowlist that retains the artifact
hash and capability contract. The CLI can check installed IDs and versions
against the bundle, surface high-impact agent/process/network/credential/native
surfaces, and fail closed on unknown versions while the runtime enforcement
layer is being completed. `guardrails policy verify` also hashes a published
VSIX before installation, closing the gap that editor settings alone cannot
close.

## Why this is differentiated

Socket and similar products are strong reference points for package and
extension threat intelligence, scanning, alerts, and policy actions. GuardRails
should win a narrower, more operationally specific problem:

- exact release approvals instead of a score that must be interpreted;
- capability contracts for themes, language tools, remote tools, security tools,
  and AI agents;
- release-to-release capability and artifact diffs;
- inventory of what is actually installed on developer devices;
- version/hash-bound approval receipts and rollback/revocation;
- editor-specific policy deployment;
- bounded runtime observations through the local Bubblewrap runner, followed by
  runtime authority enforcement through GuardRails brokers—not only static
  package inspection.

If a customer can replace the complete workflow with a generic scanner and an
allowlist setting, GuardRails has not delivered enough value. The workflow must
remain valuable after the initial scan.

## Product boundaries

Static analysis describes possible authority. Dynamic analysis records observed
behavior in a disposable runner. Runtime enforcement limits what an extension or
agent can actually do. These are separate evidence and control layers:

- static evidence never claims execution;
- dynamic evidence never claims untested behavior is safe;
- runtime policy fails closed when the broker, approval, or audit path fails;
- AI may summarize evidence but cannot create or override a decision.

## Launch acceptance gates

Before expanding the public catalog, GuardRails must have:

1. one canonical scanner build shared by web, CLI, and benchmark workers;
2. zero block decisions on the locked known-safe corpus;
3. exact artifact identity on every approved release;
4. release updates automatically returning to review when capability or binary
   identity changes;
5. a downloadable deny-by-default policy that teams can deploy;
6. CLI enforcement that fails closed for unknown versions;
7. a measured path from static evidence to runtime observation for high-impact
   extensions and AI agents;
8. an auditable receipt for every human exception.

The moat is not a larger pile of findings. It is the history of exact artifacts,
capability declarations, team decisions, release changes, runtime observations,
and enforcement outcomes tied together in one control plane.
