# GuardRails native supervisor spike

This crate starts Phase 1 with a deliberately small, line-delimited JSON IPC boundary, stable principal identities, fail-closed policy decisions, and a SHA-256-chained append-only audit writer.

It is **not a sandbox**. It does not launch untrusted processes, create Linux namespaces, mediate files, proxy network traffic, or broker credentials yet. The binary currently starts with no grants, so valid sensitive requests deny by default. Tests may inject grants to verify the decision contract.

## Run

```bash
GUARDRAILS_AUDIT_PATH=/tmp/guardrails-audit.jsonl cargo run --manifest-path native/guardrails-supervisor/Cargo.toml
```

Send one JSON envelope per line. IPC version `1` is mandatory. The audit path must not already exist; refusing to append to an unknown pre-existing chain avoids silently trusting an unauthenticated prefix.

## Next security steps

1. Authenticate the desktop-shell IPC peer.
2. Canonicalize filesystem resources inside a Linux broker.
3. Launch per-principal processes with an empty environment and no network namespace.
4. Bind approvals to executable, normalized arguments, working directory, and request digest.
5. Move the audit writer behind a restricted identity and remote append-only sink.
