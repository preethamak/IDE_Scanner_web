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

fn sensitive_request(resource: &str) -> PolicyRequest {
    PolicyRequest {
        request_id: "request:read-secret".into(),
        workspace_id: "workspace:test".into(),
        principal: "agent:test/reviewer@1".into(),
        delegation_chain: vec!["user".into()],
        capability: Capability::Secret,
        action: "read".into(),
        resource: resource.into(),
        policy_version: 4,
        requested_at_unix_ms: 1_786_118_400_000,
    }
}

fn sensitive_allowed() -> Decision {
    Decision {
        request_id: "request:read-secret".into(),
        outcome: DecisionOutcome::Allow,
        reason: DecisionReason::GrantAllowed,
        matching_grant_id: Some("grant:secret-read".into()),
        policy_version: 4,
        audit_hash: Some("b".repeat(64)),
    }
}

fn write_request(resource: &str) -> PolicyRequest {
    let mut request = request(resource);
    request.request_id = "request:create-file".into();
    request.action = "write".into();
    request
}

fn write_allowed() -> Decision {
    let mut decision = allowed();
    decision.request_id = "request:create-file".into();
    decision.matching_grant_id = Some("grant:file-write".into());
    decision
}

fn delete_request(resource: &str) -> PolicyRequest {
    let mut request = request(resource);
    request.request_id = "request:delete-file".into();
    request.action = "delete".into();
    request
}

fn delete_allowed() -> Decision {
    let mut decision = allowed();
    decision.request_id = "request:delete-file".into();
    decision.matching_grant_id = Some("grant:file-delete".into());
    decision
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

#[test]
fn requires_an_independent_secret_grant_for_credential_bearing_files() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join(".env"), b"TOKEN=private").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    let request = request("workspace/.env");

    assert_eq!(
        broker.read(&request, &allowed()),
        Err(FilesystemError::SensitiveAuthorizationRequired)
    );

    let secret_request = sensitive_request("workspace/.env");
    assert_eq!(
        broker
            .read_sensitive(&request, &allowed(), &secret_request, &sensitive_allowed())
            .unwrap(),
        b"TOKEN=private"
    );
}

#[test]
fn rejects_secret_grants_that_do_not_bind_the_same_file_and_identity() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join("id_ed25519"), b"private key").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    let request = request("workspace/id_ed25519");
    let mut mismatched = sensitive_request("workspace/.env");
    mismatched.principal = "agent:test/other@1".into();

    assert_eq!(
        broker.read_sensitive(&request, &allowed(), &mismatched, &sensitive_allowed()),
        Err(FilesystemError::AuthorizationMismatch)
    );
}

#[test]
fn allows_an_env_example_through_the_normal_source_read_path() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join(".env.example"), b"TOKEN=").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    assert_eq!(
        broker
            .read(&request("workspace/.env.example"), &allowed())
            .unwrap(),
        b"TOKEN="
    );
}

#[test]
fn creates_a_new_file_only_after_an_exact_audited_write_allow() {
    let workspace = tempdir().unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();
    let request = write_request("workspace/review-output.json");

    broker
        .create(&request, &write_allowed(), b"{\"decision\":\"allow\"}")
        .unwrap();
    assert_eq!(
        fs::read(workspace.path().join("review-output.json")).unwrap(),
        b"{\"decision\":\"allow\"}"
    );
}

#[test]
fn never_overwrites_existing_files_or_creates_sensitive_resources() {
    let workspace = tempdir().unwrap();
    fs::write(workspace.path().join("existing.txt"), b"original").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();

    assert_eq!(
        broker.create(
            &write_request("workspace/existing.txt"),
            &write_allowed(),
            b"replacement"
        ),
        Err(FilesystemError::AlreadyExists)
    );
    assert_eq!(
        fs::read(workspace.path().join("existing.txt")).unwrap(),
        b"original"
    );
    assert_eq!(
        broker.create(
            &write_request("workspace/.env"),
            &write_allowed(),
            b"TOKEN=value"
        ),
        Err(FilesystemError::SensitiveAuthorizationRequired)
    );
}

#[test]
fn denies_mismatched_or_oversized_write_requests_before_creating_a_file() {
    let workspace = tempdir().unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 3).unwrap();
    let request = write_request("workspace/out.txt");
    let mut mismatched = write_allowed();
    mismatched.request_id = "request:other".into();

    assert_eq!(
        broker.create(&request, &mismatched, b"ok"),
        Err(FilesystemError::AuthorizationMismatch)
    );
    assert_eq!(
        broker.create(&request, &write_allowed(), b"long"),
        Err(FilesystemError::TooLarge)
    );
    assert!(!workspace.path().join("out.txt").exists());
}

#[test]
fn deletes_only_an_exact_authorized_regular_workspace_file() {
    let workspace = tempdir().unwrap();
    fs::create_dir(workspace.path().join("reports")).unwrap();
    fs::write(workspace.path().join("reports/stale.json"), b"obsolete").unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();

    broker
        .delete(
            &delete_request("workspace/reports/stale.json"),
            &delete_allowed(),
        )
        .unwrap();
    assert!(!workspace.path().join("reports/stale.json").exists());
}

#[test]
fn delete_refuses_sensitive_files_directories_symlinks_and_mismatched_decisions() {
    let workspace = tempdir().unwrap();
    let outside = tempdir().unwrap();
    fs::write(workspace.path().join(".env"), b"TOKEN=value").unwrap();
    fs::create_dir(workspace.path().join("reports")).unwrap();
    fs::write(outside.path().join("outside.txt"), b"host data").unwrap();
    symlink(outside.path().join("outside.txt"), workspace.path().join("link.txt")).unwrap();
    let broker = FilesystemBroker::open(workspace.path(), 1024).unwrap();

    assert_eq!(
        broker.delete(&delete_request("workspace/.env"), &delete_allowed()),
        Err(FilesystemError::SensitiveAuthorizationRequired)
    );
    assert_eq!(
        broker.delete(&delete_request("workspace/reports"), &delete_allowed()),
        Err(FilesystemError::NotAFile)
    );
    assert_eq!(
        broker.delete(&delete_request("workspace/link.txt"), &delete_allowed()),
        Err(FilesystemError::EscapeRejected)
    );
    let mut mismatched = delete_allowed();
    mismatched.request_id = "request:other".into();
    assert_eq!(
        broker.delete(&delete_request("workspace/link.txt"), &mismatched),
        Err(FilesystemError::AuthorizationMismatch)
    );
    assert!(outside.path().join("outside.txt").exists());
}
