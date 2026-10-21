use crate::Grant;
use std::{fs::File, io::Read, path::Path};

const MAX_GRANT_FILE_BYTES: u64 = 1024 * 1024;
const MAX_GRANTS: usize = 10_000;

/// Load exact grants from a locally controlled JSON file. The file must not be
/// a symlink or group/world writable, preventing a less-privileged process
/// from swapping policy between supervisor launches.
pub fn load_grants(path: impl AsRef<Path>) -> Result<Vec<Grant>, GrantConfigError> {
    let path = path.as_ref();
    let mut file = open_grant_file(path)?;
    let metadata = file.metadata().map_err(|_| GrantConfigError::Unavailable)?;
    if !metadata.is_file() || metadata.len() > MAX_GRANT_FILE_BYTES {
        return Err(GrantConfigError::UnsafeFile);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o022 != 0 {
            return Err(GrantConfigError::UnsafeFile);
        }
    }
    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    file.read_to_end(&mut bytes)
        .map_err(|_| GrantConfigError::Unavailable)?;
    let grants: Vec<Grant> =
        serde_json::from_slice(&bytes).map_err(|_| GrantConfigError::InvalidJson)?;
    if grants.len() > MAX_GRANTS {
        return Err(GrantConfigError::TooManyGrants);
    }
    Ok(grants)
}

#[cfg(unix)]
fn open_grant_file(path: &Path) -> Result<File, GrantConfigError> {
    use std::os::unix::fs::OpenOptionsExt;
    std::fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
        .open(path)
        .map_err(|error| {
            if error.raw_os_error() == Some(libc::ELOOP) {
                GrantConfigError::UnsafeFile
            } else {
                GrantConfigError::Unavailable
            }
        })
}

#[cfg(not(unix))]
fn open_grant_file(path: &Path) -> Result<File, GrantConfigError> {
    let metadata = std::fs::symlink_metadata(path).map_err(|_| GrantConfigError::Unavailable)?;
    if metadata.file_type().is_symlink() {
        return Err(GrantConfigError::UnsafeFile);
    }
    File::open(path).map_err(|_| GrantConfigError::Unavailable)
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
