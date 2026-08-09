use crate::protocol::{Decision, PolicyRequest};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs::{File, OpenOptions},
    io::{self, Write},
    path::Path,
};

#[derive(Serialize)]
struct AuditRecord<'a> {
    sequence: u64,
    previous_hash: &'a str,
    hash: &'a str,
    request_id: &'a str,
    workspace_id: &'a str,
    principal: &'a str,
    delegation_chain: &'a [String],
    capability: &'a crate::protocol::Capability,
    action: &'a str,
    normalized_resource: &'a str,
    policy_version: u64,
    outcome: &'a crate::protocol::DecisionOutcome,
    reason: &'a crate::protocol::DecisionReason,
    matching_grant_id: &'a Option<String>,
    requested_at_unix_ms: u64,
}

pub struct AuditWriter {
    file: File,
    sequence: u64,
    previous_hash: String,
}

impl AuditWriter {
    pub fn create(path: impl AsRef<Path>) -> io::Result<Self> {
        let file = OpenOptions::new().create_new(true).write(true).open(path)?;
        Ok(Self {
            file,
            sequence: 0,
            previous_hash: "0".repeat(64),
        })
    }

    pub fn append(&mut self, request: &PolicyRequest, decision: &Decision) -> io::Result<String> {
        self.sequence += 1;
        let canonical = format!(
            "{}\0{}\0{}\0{}\0{}\0{}\0{:?}\0{}\0{}\0{}\0{:?}\0{:?}\0{:?}\0{}",
            self.sequence,
            self.previous_hash,
            request.request_id,
            request.workspace_id,
            request.principal,
            request.delegation_chain.join("\0"),
            request.capability,
            request.action,
            request.resource,
            request.policy_version,
            decision.outcome,
            decision.reason,
            decision.matching_grant_id,
            request.requested_at_unix_ms
        );
        let hash = hex(&Sha256::digest(canonical.as_bytes()));
        let record = AuditRecord {
            sequence: self.sequence,
            previous_hash: &self.previous_hash,
            hash: &hash,
            request_id: &request.request_id,
            workspace_id: &request.workspace_id,
            principal: &request.principal,
            delegation_chain: &request.delegation_chain,
            capability: &request.capability,
            action: &request.action,
            normalized_resource: &request.resource,
            policy_version: request.policy_version,
            outcome: &decision.outcome,
            reason: &decision.reason,
            matching_grant_id: &decision.matching_grant_id,
            requested_at_unix_ms: request.requested_at_unix_ms,
        };
        serde_json::to_writer(&mut self.file, &record)?;
        self.file.write_all(b"\n")?;
        self.file.sync_data()?;
        self.previous_hash = hash.clone();
        Ok(hash)
    }
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}
