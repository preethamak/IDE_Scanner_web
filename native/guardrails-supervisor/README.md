# GuardRails native supervisor spike

This crate starts Phase 1 with a deliberately small, line-delimited JSON IPC boundary, stable principal identities, fail-closed policy decisions, and a SHA-256-chained append-only audit writer.

It is **not a sandbox**. It does not launch untrusted processes, create Linux namespaces, proxy network traffic, or broker credentials yet. The crate now contains a Linux read-only filesystem broker spike, but the binary does not expose it to IPC. The binary currently starts with no grants, so valid sensitive requests deny by default. Tests may inject grants to verify the decision contract.

## Linux filesystem broker spike

`FilesystemBroker` opens a pinned workspace directory and uses one `openat2(2)` operation with `RESOLVE_BENEATH`, `RESOLVE_NO_MAGICLINKS`, and `RESOLVE_NO_SYMLINKS`. Reads require an exact filesystem/read allow decision bound to the same request ID and policy version, plus a successful audit receipt. Absolute paths, dot segments, backslashes, symlinks, non-files, missing files, and oversized reads fail closed with stable broker errors.

Credential-bearing resources have an independent authorization path. `.env` (other than `.env.example`), private keys, credential files, and common package-manager credential files deny through `read`; callers must use `read_sensitive` with an additional exact `secret/read` allow decision. Both decisions must carry an audit receipt and bind the same principal, workspace, resource, delegation chain, and policy version. This prevents a broad filesystem-read approval from silently authorizing credential access.

`create` is an intentionally narrow write primitive. It needs an exact `filesystem/write` allow decision with an audit receipt, creates only a previously absent non-sensitive file beneath the pinned workspace, limits content to the broker byte limit, writes with mode `0600`, and calls `fsync`. It will not replace existing files or create classified credential resources.

This is deliberately narrower than the filesystem MVP acceptance criteria. Write grants, mount namespaces, case-folding and alternate-stream conformance, lease revocation, and untrusted-process tests are not implemented.

## Run

```bash
GUARDRAILS_AUDIT_PATH=/tmp/guardrails-audit.jsonl cargo run --manifest-path native/guardrails-supervisor/Cargo.toml
```

Send one JSON envelope per line. IPC version `1` is mandatory. The audit path must not already exist; refusing to append to an unknown pre-existing chain avoids silently trusting an unauthenticated prefix.

To run with grants, set `GUARDRAILS_GRANTS_PATH` to a JSON array of exact
`Grant` records. The supervisor rejects symlinks, files larger than 1 MiB, files
with more than 10,000 grants, malformed JSON, and (on Unix) files writable by
group or other users. Omitting the variable starts with no grants and denies by
default.

## Next security steps

1. Authenticate the desktop-shell IPC peer.
2. Add atomic replacement, sensitive-file write grants, and scoped directory creation to the Linux filesystem broker.
3. Launch per-principal processes with an empty environment and an isolated network namespace.
4. Bind approvals to executable, normalized arguments, working directory, and request digest.
5. Move the audit writer behind a restricted identity and remote append-only sink.
