# Threat model

## Assets

- Source code, unreleased artifacts, and repository history
- Developer credentials, signing keys, cloud tokens, and local environment variables
- Developer identity and authenticated browser sessions
- Build infrastructure, package registries, and deployment environments
- User intent, approvals, policy configuration, and security audit records

## Untrusted principals

- Marketplace extensions, including compromised updates
- Language servers, formatters, debuggers, task runners, and package scripts
- AI models, agent loops, MCP/tool servers, generated commands, and retrieved content
- Workspace files that can contain prompt injection or malicious configuration
- Remote repositories and their transitive dependencies

The GuardRails UI, policy broker, credential broker, and audit writer are trusted but security-sensitive. They must remain small, versioned, independently testable, and isolated from untrusted extension code.

## Primary abuse cases

| Abuse case | Required control |
| --- | --- |
| Extension reads `.env`, SSH keys, or cloud config | Virtualized workspace filesystem; default-deny host paths; explicit path grants |
| Agent sends source code to an arbitrary host | Destination-scoped network grants; egress proxy; payload classification; approval threshold |
| Tool runs `curl ... | sh` or destructive shell commands | Structured command broker; executable/argument policy; isolated runner; human approval |
| Extension update adds new capabilities | Signed manifest diff; grants invalidated on capability expansion; re-approval |
| Prompt injection asks an agent to reveal credentials | Secret values excluded from model context; credential handles; output redaction |
| Tool traverses symlinks outside the workspace | Canonical path resolution inside broker; mount namespace boundary |
| Two extensions collude through shared files or ports | Per-principal identity, storage, process namespace, and network policy |
| Malicious process tampers with audit history | Append-only remote audit sink; chained event hashes; restricted writer identity |
| Approved operation changes after review | Bind approval to normalized request digest, principal, policy version, and expiry |

## Security invariants

1. No untrusted principal can access a host resource without a broker decision.
2. Absence of a matching grant always denies the request.
3. An explicit matching deny rule overrides any allow rule.
4. Secret material is never returned through the ordinary tool response channel.
5. Approval applies only to the exact normalized action displayed to the user.
6. Policy and audit failures fail closed.
7. The renderer and extension host never share a privileged process or identity.

## Out of scope for the first slice

- Claiming safe execution based only on JavaScript-level policy checks
- Perfect detection of data encoded or transformed before exfiltration
- Running arbitrary legacy extensions without compatibility or security tradeoffs
- Protecting a machine where the host OS or GuardRails trusted computing base is compromised
