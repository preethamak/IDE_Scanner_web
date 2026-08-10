use serde::{Deserialize, Serialize};

pub const IPC_VERSION: u16 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct IpcEnvelope<T> {
    pub version: u16,
    pub payload: T,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    Filesystem,
    Network,
    Process,
    Secret,
    Clipboard,
    Editor,
    Tool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PolicyRequest {
    pub request_id: String,
    pub workspace_id: String,
    pub principal: String,
    #[serde(default)]
    pub delegation_chain: Vec<String>,
    pub capability: Capability,
    pub action: String,
    pub resource: String,
    pub policy_version: u64,
    pub requested_at_unix_ms: u64,
}

#[derive(Clone, Debug)]
pub struct Grant {
    pub id: String,
    pub workspace_id: String,
    pub principal: String,
    pub capability: Capability,
    pub action: String,
    pub resource: String,
    pub effect: DecisionOutcome,
    pub expires_at_unix_ms: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DecisionOutcome {
    Allow,
    Deny,
    Prompt,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DecisionReason {
    GrantAllowed,
    ExplicitDeny,
    ApprovalRequired,
    NoMatchingGrant,
    InvalidProtocol,
    InvalidRequest,
    AuditUnavailable,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Decision {
    pub request_id: String,
    pub outcome: DecisionOutcome,
    pub reason: DecisionReason,
    pub matching_grant_id: Option<String>,
    pub policy_version: u64,
    pub audit_hash: Option<String>,
}
