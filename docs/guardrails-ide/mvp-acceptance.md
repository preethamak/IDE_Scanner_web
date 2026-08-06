# MVP acceptance criteria

## Policy engine

- Unknown, malformed, expired, cross-workspace, and unmatched requests deny closed.
- Explicit deny rules override matching allow rules.
- Principal, capability, action, resource, workspace, and expiry are all enforced.
- Prompt decisions identify the exact grant and normalized request requiring approval.
- Every decision provides a stable reason code suitable for UI and audit records.

## Filesystem

- A principal sees only explicitly mounted workspace paths.
- Canonical resolution rejects `..`, symlink, junction, case-folding, and alternate-stream escapes.
- Read and write permissions are independent.
- Sensitive names such as `.env`, private keys, credential stores, and VCS credentials require separate grants.

## Process and network

- Processes start with an empty environment and cannot inherit broker credentials.
- Executable identity, normalized arguments, working directory, and request digest are approval-bound.
- Network is disabled by default and enforced outside the process.
- DNS rebinding, redirect, proxy, loopback, link-local, and cloud-metadata bypasses are denied.

## Agents and tools

- Model context excludes raw secrets and files outside granted paths.
- An agent cannot silently expand its own capabilities or those of delegated tools.
- Writes default to a reviewable patch; destructive and repository-history changes require exact-action approval.
- Tool outputs are treated as untrusted content and cannot issue broker calls without an independent policy decision.

## Audit and recovery

- Decisions record principal, delegation chain, normalized resource, policy version, reason, and timestamp without secret values.
- Audit records are chained and exported to a writer unavailable to untrusted principals.
- Revocation terminates active leases and future requests fail closed.
- Broker, policy-store, proxy, or audit-writer failure denies sensitive operations.

## Release gates

- Unit tests cover all policy branches and boundary normalization.
- Property tests and fuzzing exercise resource parsers and policy evaluation.
- Sandbox conformance tests run from inside the untrusted process.
- End-to-end tests verify permission prompts, approval binding, revocation, and audit visibility.
- Independent penetration testing closes all critical and high findings before public beta.
