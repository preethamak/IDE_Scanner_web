use guardrails_supervisor::{AuditWriter, IpcEnvelope, PolicyRequest, Supervisor};
use std::{
    env,
    io::{self, BufRead, Write},
    path::PathBuf,
};

const MAX_MESSAGE_BYTES: usize = 64 * 1024;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let audit_path = env::var_os("GUARDRAILS_AUDIT_PATH")
        .map(PathBuf::from)
        .ok_or("GUARDRAILS_AUDIT_PATH is required")?;
    let audit = AuditWriter::create(audit_path)?;
    let mut supervisor = Supervisor::new(Vec::new(), audit);
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.len() > MAX_MESSAGE_BYTES {
            writeln!(stdout, "{{\"version\":1,\"error\":\"MESSAGE_TOO_LARGE\"}}")?;
            stdout.flush()?;
            continue;
        }
        let envelope: IpcEnvelope<PolicyRequest> = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(_) => {
                writeln!(stdout, "{{\"version\":1,\"error\":\"INVALID_JSON\"}}")?;
                stdout.flush()?;
                continue;
            }
        };
        let response = IpcEnvelope {
            version: 1,
            payload: supervisor.decide(envelope),
        };
        serde_json::to_writer(&mut stdout, &response)?;
        writeln!(stdout)?;
        stdout.flush()?;
    }
    Ok(())
}
