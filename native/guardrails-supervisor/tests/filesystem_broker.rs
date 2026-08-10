#![cfg(target_os = "linux")]

use guardrails_supervisor::{
    Capability, Decision, DecisionOutcome, DecisionReason, FilesystemBroker, FilesystemError,
    PolicyRequest,
};
use std::{fs, os::unix::fs::symlink};
use tempfile::tempdir;

fn request(resource: &str) -> PolicyRequest {
    PolicyRequest {
        request_id: "request:read-source".into(),
        workspace_id: "workspace:test".into(),
        principal: "agent:test/reviewer@1".into(),
        delegation_chain: vec!["user".into()],
        capability: Capability::Filesystem,
        action: "read".into(),
        resource: resource.into(),
        policy_version: 4,
        requested_at_unix_ms: 1_786_118_400_000,
    }
}

fn allowed() -> Decision {
    Decision {
        request_id: "request:read-source".into(),
        outcome: DecisionOutcome::Allow,
        reason: DecisionReason::GrantAllowed,
        matching_grant_id: Some("grant:source-read".into()),
        policy_version: 4,
        audit_hash: Some("a".repeat(64)),
    }
}

#[test]
fn reads_only_an_exact_authorized_workspace_file() {
    let workspace = tempdir().unwrap();
    fs::create_dir(workspace.path().join("src")).unwrap();
    fs::write(workspace.path().join("src/lib.rs"), b"pub fn safe() {}\n").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    assert_eq!(
        broker
            .read(&request("workspace/src/lib.rs"), &allowed())
            .unwrap(),
        b"pub fn safe() {}\n"
    );
}

#[test]
fn rejects_traversal_absolute_and_symlink_escape_paths() {
    let workspace = tempdir().unwrap();
    let outside = tempdir().unwrap();
    fs::write(outside.path().join("secret"), b"host secret").unwrap();
    symlink(outside.path(), workspace.path().join("escape")).unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();

    assert_eq!(
        broker.read(&request("workspace/../secret"), &allowed()),
        Err(FilesystemError::InvalidResource)
    );
    assert_eq!(
        broker.read(&request("/etc/passwd"), &allowed()),
        Err(FilesystemError::InvalidResource)
    );
    assert_eq!(
        broker.read(&request("workspace/escape/secret"), &allowed()),
        Err(FilesystemError::EscapeRejected)
    );
}

#[test]
fn requires_an_allow_bound_to_the_request_and_audit_receipt() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join("README.md"), b"safe").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    let request = request("workspace/README.md");

    let mut denied = allowed();
    denied.outcome = DecisionOutcome::Deny;
    assert_eq!(broker.read(&request, &denied), Err(FilesystemError::Denied));

    let mut wrong_request = allowed();
    wrong_request.request_id = "request:other".into();
    assert_eq!(
        broker.read(&request, &wrong_request),
        Err(FilesystemError::AuthorizationMismatch)
    );

    let mut unaudited = allowed();
    unaudited.audit_hash = None;
    assert_eq!(
        broker.read(&request, &unaudited),
        Err(FilesystemError::AuthorizationMismatch)
    );
}

#[test]
fn enforces_a_bounded_read() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join("large.txt"), vec![b'x'; 33]).unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 32).unwrap();
    assert_eq!(
        broker.read(&request("workspace/large.txt"), &allowed()),
        Err(FilesystemError::TooLarge)
    );
}
