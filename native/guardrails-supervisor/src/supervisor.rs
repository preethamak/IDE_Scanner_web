use crate::{audit::AuditWriter, protocol::*};

pub struct Supervisor {
    grants: Vec<Grant>,
    audit: AuditWriter,
}

impl Supervisor {
    pub fn new(grants: Vec<Grant>, audit: AuditWriter) -> Self {
        Self { grants, audit }
    }

    pub fn decide(&mut self, envelope: IpcEnvelope<PolicyRequest>) -> Decision {
        let request = envelope.payload;
        let mut decision = if envelope.version != IPC_VERSION {
            denied(&request, DecisionReason::InvalidProtocol)
        } else if !valid_request(&request) {
            denied(&request, DecisionReason::InvalidRequest)
        } else {
            evaluate(&request, &self.grants)
        };
        match self.audit.append(&request, &decision) {
            Ok(hash) => decision.audit_hash = Some(hash),
            Err(_) => {
                decision.outcome = DecisionOutcome::Deny;
                decision.reason = DecisionReason::AuditUnavailable;
                decision.matching_grant_id = None;
                decision.audit_hash = None;
            }
        }
        decision
    }
}

fn valid_request(request: &PolicyRequest) -> bool {
    !request.request_id.trim().is_empty()
        && valid_workspace(&request.workspace_id)
        && valid_principal(&request.principal)
        && request
            .delegation_chain
            .iter()
            .all(|item| valid_principal(item))
        && !request.action.trim().is_empty()
        && valid_resource(&request.resource)
        && request.policy_version > 0
        && request.requested_at_unix_ms > 0
}

fn valid_workspace(value: &str) -> bool {
    value.starts_with("workspace:") && safe_identity(value)
}
fn valid_principal(value: &str) -> bool {
    value == "user"
        || ["extension:", "agent:", "tool:", "task:"]
            .iter()
            .any(|prefix| value.starts_with(prefix))
            && safe_identity(value)
}
fn safe_identity(value: &str) -> bool {
    value.len() <= 256
        && !value.contains("..")
        && !value.contains("//")
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b":/@._-".contains(&byte))
}

fn valid_resource(value: &str) -> bool {
    !value.trim().is_empty()
        && !value.contains('\0')
        && !value
            .split('/')
            .any(|segment| segment == ".." || segment == ".")
}

fn evaluate(request: &PolicyRequest, grants: &[Grant]) -> Decision {
    let matches: Vec<&Grant> = grants
        .iter()
        .filter(|grant| {
            grant.workspace_id == request.workspace_id
                && grant.principal == request.principal
                && grant.capability == request.capability
                && grant.action == request.action
                && grant.resource == request.resource
                && grant
                    .expires_at_unix_ms
                    .is_none_or(|expiry| expiry > request.requested_at_unix_ms)
        })
        .collect();
    if let Some(grant) = matches
        .iter()
        .find(|grant| grant.effect == DecisionOutcome::Deny)
    {
        return matched(
            request,
            grant,
            DecisionOutcome::Deny,
            DecisionReason::ExplicitDeny,
        );
    }
    if let Some(grant) = matches.first() {
        let (outcome, reason) = if grant.effect == DecisionOutcome::Prompt {
            (DecisionOutcome::Prompt, DecisionReason::ApprovalRequired)
        } else {
            (DecisionOutcome::Allow, DecisionReason::GrantAllowed)
        };
        return matched(request, grant, outcome, reason);
    }
    denied(request, DecisionReason::NoMatchingGrant)
}

fn matched(
    request: &PolicyRequest,
    grant: &Grant,
    outcome: DecisionOutcome,
    reason: DecisionReason,
) -> Decision {
    Decision {
        request_id: request.request_id.clone(),
        outcome,
        reason,
        matching_grant_id: Some(grant.id.clone()),
        policy_version: request.policy_version,
        audit_hash: None,
    }
}
fn denied(request: &PolicyRequest, reason: DecisionReason) -> Decision {
    Decision {
        request_id: request.request_id.clone(),
        outcome: DecisionOutcome::Deny,
        reason,
        matching_grant_id: None,
        policy_version: request.policy_version,
        audit_hash: None,
    }
}
