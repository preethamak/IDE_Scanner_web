# GuardRails IDE

GuardRails IDE is a security-first, VS Code-compatible development environment. Its defining rule is that extensions, terminals, build tools, and AI agents receive **no ambient authority**: every sensitive operation is mediated by a small, auditable broker and evaluated against an explicit capability grant.

This directory is the implementation plan and security contract for the product. The first executable slice is a deterministic policy engine plus a browser-based control-plane preview. It proves the permission model before we attempt editor compatibility or native process isolation.

## Product principles

1. **Deny by default.** A tool can only use capabilities named in its manifest and granted for the current workspace.
2. **Broker every boundary.** File access, process execution, network egress, credentials, clipboard access, and host APIs cross a narrow broker interface.
3. **Never hand out raw secrets.** A credential broker injects short-lived credentials into an approved request or process without revealing the value to an extension or model context.
4. **Scope grants tightly.** Grants identify the principal, workspace, capability, resource pattern, action, and expiry.
5. **Separate reading from changing.** Read, write, execute, approve, and export are distinct actions.
6. **Make agent actions reviewable.** AI agents produce plans and proposed changes; high-impact actions require a human checkpoint.
7. **Record security decisions.** Allow, deny, prompt, and broker actions emit tamper-evident audit events with secret-safe metadata.
8. **Treat compatibility as untrusted input.** VS Code extensions run behind adapters and sandboxes, not inside the trusted UI process.

## Documents

- [Threat model](threat-model.md)
- [Architecture and trust boundaries](architecture.md)
- [Delivery roadmap](roadmap.md)
- [MVP acceptance criteria](mvp-acceptance.md)

## Initial product slice

The first slice includes:

- a typed capability and policy contract;
- deterministic policy evaluation with deny-overrides semantics;
- resource-pattern and expiry enforcement;
- human-readable decision reasons and matching grant IDs;
- a GuardRails IDE control-plane screen demonstrating extension and agent requests;
- unit tests for default denial, scoped grants, expiration, principal isolation, and explicit deny rules.

This is intentionally not presented as an OS sandbox. The policy engine is one layer; production isolation additionally requires separate operating-system processes, restricted identities, filesystem mounts, syscall controls, and a network proxy.
