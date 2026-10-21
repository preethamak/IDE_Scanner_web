# Capability Control Plane Runbook

This runbook operates GuardRails developer-capability inventory, policy, and
enforcement exports. It is for the workspace owner, security reviewer, and
platform operator. It does not grant an AI assistant authority to change a
workspace.

## Deployment order

Deploy the collector API before collector clients, and deploy policy storage
before simulation, rollback, or MCP policy-read features. The review PR order
for this release is:

1. Collector API and CLI collector.
2. Collector retry receipts and retry-safe CLI client.
3. Capability policy export and CLI policy enforcement.
4. Policy simulation, policy lifecycle controls, and MCP policy read access.

Run the focused test suites for each component before promotion. A Vercel
account deployment block is an operational incident, not a passing deployment;
do not describe a blocked deployment as production.

## API keys and collector privacy

Create a workspace API key scoped only to `collector:write` for device
collection. Never use a browser session token, owner credential, or a broader
integration key on a developer device. The API key selects the workspace; the
client cannot choose a different workspace in the payload.

The collector uploads extension identity/version, exact artifact hashes only
when available, declared MCP server capability signals, and relationships. It
must not upload local paths, extension source files, command arguments, or
secret values. Review a dry run before a fleet rollout:

```bash
guardrails collect --ide cursor --device-id engineering-laptop-01 --dry-run
```

## Reliable collection

Collector snapshots use `guardrails.collector-snapshot.v1`. The server exposes
the accepted schema through authenticated `GET /api/collector/capabilities`.
Clients include a stable `Idempotency-Key` for a snapshot and retry transient
network, timeout, throttling, and server failures only. A repeated key with
the same snapshot returns the original receipt without rewriting inventory or
audit state. A repeated key with different content returns HTTP 409; generate a
new snapshot rather than retrying that request.

Retain the receipt ID with the device-management job record. A successful
transport response without a receipt should be investigated before declaring
the device current.

## Policy change procedure

1. Open the saved capability policy. Verify its current version and grants.
2. Make the smallest proposed grant change. A policy is deny-by-default.
3. Simulate the draft against the current collected graph. Review allow,
   approval-required, deny, and changed-subject counts.
4. Treat unknown capability evidence as approval-required, never as an allow.
5. Save only after a human owner or admin approves the expected impact.
6. Export the policy bundle and run CLI enforcement on a representative device.
7. Record the export hash, policy version, approver, and receipt in the change
   record.

Policy simulation is non-persisting. Saving and rollback require an owner or
admin. Every saved or restored policy creates a new forward version and an
audit receipt; retained versions are evidence, not mutable drafts.

## Emergency rollback

Use rollback when a newly published grant unintentionally denies essential
developer work or expands authority incorrectly. Restore the retained version
from the workspace policy controls. GuardRails creates a new policy version
whose grants match the retained version, preserving the broken version and
rollback actor in the audit log.

After rollback, export a new policy bundle and run:

```bash
guardrails policy capabilities --bundle guardrails-capability-policy.json
guardrails policy check --bundle guardrails-enterprise-policy.json --ide cursor
```

Do not replace exported files in place without recording their hash and policy
version. A local installed-extension check is version-aware but cannot prove a
directory is the exact published VSIX; use artifact verification before
declaring byte-level compliance.

## MCP access

The MCP endpoint is read-only. Public tools return published extension
evidence. Workspace tools require OAuth `workspace:read` and a current
membership check. The capability-policy MCP tool returns the policy and its
evaluated enforcement export; it cannot save a grant, install an extension,
acknowledge an alert, or restore a policy.

For AI-assisted review, require the assistant to cite the exact workspace,
policy version, export hash, subject evidence state, and any approval-required
outcomes. An assistant summary is not a policy approval.

## Incident evidence

For an extension or policy incident, preserve:

- collector receipt ID, device ID, and reported timestamp;
- policy version and exported policy hash;
- exact report artifact and SHA-256 digest attestation;
- report comparison before/after the release or policy change;
- relevant workspace audit events and human rationale.

Use the CLI's report attestation and report diff commands for offline evidence
handling. Digest attestations prove file identity only; they do not prove a
signer identity.

## Failure boundaries

- Missing or incomplete analysis cannot become `allow`.
- Unreviewed extension releases are unknown, not approved.
- Collector schema mismatch, idempotency conflict, or unavailable storage must
  be surfaced to the operator; do not silently discard the snapshot.
- If production deployment is blocked by the deployment provider, stop the
  release and use the provider incident process. Green repository tests do not
  override a blocked deployment.
