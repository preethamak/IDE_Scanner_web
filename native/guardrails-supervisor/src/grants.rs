use crate::Grant;
use std::{fs, path::Path};

const MAX_GRANT_FILE_BYTES: u64 = 1024 * 1024;
const MAX_GRANTS: usize = 10_000;

/// Load exact grants from a locally controlled JSON file. The file must not be
/// a symlink or group/world writable, preventing a less-privileged process
/// from swapping policy between supervisor launches.
pub fn load_grants(path: impl AsRef<Path>) -> Result<Vec<Grant>, GrantConfigError> {
    let path = path.as_ref();
    let metadata = fs::symlink_metadata(path).map_err(|_| GrantConfigError::Unavailable)?;
    if metadata.file_type().is_symlink()
        || !metadata.is_file()
        || metadata.len() > MAX_GRANT_FILE_BYTES
    {
        return Err(GrantConfigError::UnsafeFile);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o022 != 0 {
            return Err(GrantConfigError::UnsafeFile);
        }
    }
    let bytes = fs::read(path).map_err(|_| GrantConfigError::Unavailable)?;
    let grants: Vec<Grant> =
        serde_json::from_slice(&bytes).map_err(|_| GrantConfigError::InvalidJson)?;
    if grants.len() > MAX_GRANTS {
        return Err(GrantConfigError::TooManyGrants);
    }
    Ok(grants)
}

#[derive(Debug, PartialEq, Eq)]
pub enum GrantConfigError {
    Unavailable,
    UnsafeFile,
    InvalidJson,
    TooManyGrants,
}

impl std::fmt::Display for GrantConfigError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::Unavailable => "GRANT_CONFIG_UNAVAILABLE",
            Self::UnsafeFile => "GRANT_CONFIG_UNSAFE_FILE",
            Self::InvalidJson => "GRANT_CONFIG_INVALID_JSON",
            Self::TooManyGrants => "GRANT_CONFIG_TOO_MANY_GRANTS",
        })
    }
}

impl std::error::Error for GrantConfigError {}
