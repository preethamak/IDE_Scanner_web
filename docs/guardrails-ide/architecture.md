# Architecture and trust boundaries

## Runtime shape

```text
Trusted desktop shell / web control plane
        |
        v
Capability broker ---- Policy store ---- Audit writer
   |        |                 |                 |
   |        +---- Approval UI |                 +--> append-only sink
   |
   +--> Filesystem broker --> workspace-scoped mount
   +--> Command broker ----> disposable sandbox runner
   +--> Network broker ----> authenticated egress proxy
   +--> Credential broker -> provider / OS keychain (opaque handles only)
   +--> Tool broker -------> isolated MCP and agent tool processes
```

## Principal model

Every request has a stable principal:

- `user`: a direct user gesture;
- `extension:<publisher>/<name>@<digest>`;
- `agent:<provider>/<profile>@<version>`;
- `tool:<server>/<tool>@<digest>`;
- `task:<workspace>/<task>@<revision>`.

Delegation never inherits all authority. A parent principal can delegate only a subset of its own grants, and the audit event records the complete delegation chain.

## Capability contract

Each request contains:

- principal and workspace IDs;
- capability (`filesystem`, `network`, `process`, `secret`, `clipboard`, `editor`, or `tool`);
- action such as `read`, `write`, `connect`, `execute`, `inject`, or `invoke`;
- normalized resource;
- optional structured context;
- policy version and request timestamp.

A grant adds an effect (`allow` or `deny`), resource glob, permitted actions, optional expiration, and approval mode. The broker first validates the request, resolves the resource canonically, evaluates all applicable policy, and returns one of `allow`, `deny`, or `prompt`.

## Process isolation target

The production desktop runtime should use a small native supervisor. Each extension or agent tool executes under a distinct OS identity in a disposable sandbox with:

- read-only runtime image;
- explicitly mounted workspace subpaths;
- empty inherited environment;
- no host network namespace;
- syscall and process limits;
- broker-only IPC;
- bounded CPU, memory, storage, and execution time.

Linux can use namespaces, Landlock/seccomp, cgroups, and a brokered egress namespace. macOS should use sandbox profiles and hardened runtime boundaries. Windows should use AppContainer/restricted tokens, job objects, and Windows Filtering Platform. Platform implementations must pass the same conformance suite.

## Secret handling

Secrets live in an OS keychain or external provider. Tools receive opaque handles. For an approved operation, the credential broker either:

- adds a credential directly to a destination-bound HTTP request;
- exposes it to one isolated process through a short-lived, non-inherited channel; or
- signs an operation without exposing key material.

Logs, prompts, diffs, telemetry, process listings, and tool responses are scanned for registered secret fingerprints and redacted before leaving the broker.

## Compatibility strategy

GuardRails should reuse open editor protocols and UI components where practical, but extension compatibility is tiered:

1. **Native-safe:** extension declares capabilities and uses GuardRails broker APIs.
2. **Adapted:** common VS Code APIs map to broker calls with generated capability prompts.
3. **Contained legacy:** extension runs remotely or in a disposable sandbox with reduced features.
4. **Blocked:** extension requires unsafe host authority that cannot be mediated.

Compatibility percentages must never override the security invariants in the threat model.
