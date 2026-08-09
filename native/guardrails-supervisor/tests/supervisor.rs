use guardrails_supervisor::{
    AuditWriter, Capability, DecisionOutcome, DecisionReason, Grant, IpcEnvelope, PolicyRequest,
    Supervisor,
};
use std::fs;
use tempfile::tempdir;

fn request() -> PolicyRequest {
    PolicyRequest {
        request_id: "req-1".into(),
        workspace_id: "workspace:demo".into(),
        principal: "agent:guardrails/reviewer@1".into(),
        delegation_chain: vec!["user".into()],
        capability: Capability::Filesystem,
        action: "read".into(),
        resource: "workspace/src/main.rs".into(),
        policy_version: 1,
        requested_at_unix_ms: 1_786_118_400_000,
    }
}
fn supervisor(grants: Vec<Grant>) -> (Supervisor, std::path::PathBuf) {
    let dir = tempdir().unwrap().keep();
    let path = dir.join("audit.jsonl");
    (
        Supervisor::new(grants, AuditWriter::create(&path).unwrap()),
        path,
    )
}
fn grant(effect: DecisionOutcome) -> Grant {
    let request = request();
    Grant {
        id: "grant-1".into(),
        workspace_id: request.workspace_id,
        principal: request.principal,
        capability: request.capability,
        action: request.action,
        resource: request.resource,
        effect,
        expires_at_unix_ms: None,
    }
}

#[test]
fn denies_unknown_protocol_and_unmatched_requests() {
    let (mut runtime, _) = supervisor(vec![]);
    let invalid = runtime.decide(IpcEnvelope {
        version: 2,
        payload: request(),
    });
    assert_eq!(invalid.outcome, DecisionOutcome::Deny);
    assert_eq!(invalid.reason, DecisionReason::InvalidProtocol);
    let denied = runtime.decide(IpcEnvelope {
        version: 1,
        payload: request(),
    });
    assert_eq!(denied.reason, DecisionReason::NoMatchingGrant);
}

#[test]
fn binds_allow_to_exact_principal_workspace_action_and_resource() {
    let (mut runtime, _) = supervisor(vec![grant(DecisionOutcome::Allow)]);
    let allowed = runtime.decide(IpcEnvelope {
        version: 1,
        payload: request(),
    });
    assert_eq!(allowed.outcome, DecisionOutcome::Allow);
    let mut changed = request();
    changed.resource = "workspace/.env".into();
    assert_eq!(
        runtime
            .decide(IpcEnvelope {
                version: 1,
                payload: changed
            })
            .outcome,
        DecisionOutcome::Deny
    );
}

#[test]
fn explicit_deny_overrides_allow_and_expired_grants_do_not_match() {
    let mut expired = grant(DecisionOutcome::Allow);
    expired.id = "expired".into();
    expired.expires_at_unix_ms = Some(1);
    let (mut runtime, _) = supervisor(vec![
        grant(DecisionOutcome::Allow),
        grant(DecisionOutcome::Deny),
        expired,
    ]);
    let decision = runtime.decide(IpcEnvelope {
        version: 1,
        payload: request(),
    });
    assert_eq!(decision.reason, DecisionReason::ExplicitDeny);
}

#[test]
fn rejects_malformed_identity_and_null_resource() {
    let (mut runtime, _) = supervisor(vec![grant(DecisionOutcome::Allow)]);
    let mut malformed = request();
    malformed.principal = "agent:../../root".into();
    malformed.resource = "workspace/src/\0secret".into();
    assert_eq!(
        runtime
            .decide(IpcEnvelope {
                version: 1,
                payload: malformed
            })
            .reason,
        DecisionReason::InvalidRequest
    );
}

#[test]
fn rejects_dot_segment_resources_before_policy_matching() {
    let (mut runtime, _) = supervisor(vec![grant(DecisionOutcome::Allow)]);
    let mut malformed = request();
    malformed.resource = "workspace/src/../../.env".into();
    assert_eq!(
        runtime
            .decide(IpcEnvelope {
                version: 1,
                payload: malformed
            })
            .reason,
        DecisionReason::InvalidRequest
    );
}

#[test]
fn writes_a_secret_safe_hash_chain() {
    let (mut runtime, path) = supervisor(vec![grant(DecisionOutcome::Allow)]);
    let first = runtime.decide(IpcEnvelope {
        version: 1,
        payload: request(),
    });
    let second = runtime.decide(IpcEnvelope {
        version: 1,
        payload: request(),
    });
    assert_ne!(first.audit_hash, second.audit_hash);
    let lines: Vec<serde_json::Value> = fs::read_to_string(path)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert_eq!(lines.len(), 2);
    assert_eq!(lines[1]["previous_hash"], lines[0]["hash"]);
    assert!(
        lines
            .iter()
            .all(|event| event.get("secret_value").is_none())
    );
    assert_eq!(lines[0]["delegation_chain"][0], "user");
}
