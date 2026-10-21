use guardrails_supervisor::{Capability, DecisionOutcome, Grant, GrantConfigError, load_grants};
use std::fs;
use tempfile::tempdir;

fn grant() -> Grant {
    Grant {
        id: "grant:read".into(),
        workspace_id: "workspace:demo".into(),
        principal: "agent:guardrails/reviewer@1".into(),
        capability: Capability::Filesystem,
        action: "read".into(),
        resource: "workspace/README.md".into(),
        effect: DecisionOutcome::Allow,
        expires_at_unix_ms: None,
    }
}

#[test]
fn loads_exact_grants_from_a_local_json_file() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("grants.json");
    fs::write(&path, serde_json::to_vec(&vec![grant()]).unwrap()).unwrap();
    assert_eq!(load_grants(path).unwrap()[0].id, "grant:read");
}

#[test]
fn rejects_malformed_config_without_falling_open() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("grants.json");
    fs::write(&path, b"not-json").unwrap();
    assert!(matches!(
        load_grants(path),
        Err(GrantConfigError::InvalidJson)
    ));
}

#[cfg(unix)]
#[test]
fn rejects_a_group_or_world_writable_grant_file() {
    use std::os::unix::fs::PermissionsExt;
    let directory = tempdir().unwrap();
    let path = directory.path().join("grants.json");
    fs::write(&path, serde_json::to_vec(&vec![grant()]).unwrap()).unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o666)).unwrap();
    assert!(matches!(
        load_grants(path),
        Err(GrantConfigError::UnsafeFile)
    ));
}
