use crate::{Capability, Decision, DecisionOutcome, PolicyRequest};
use std::{
    ffi::CString,
    fmt,
    fs::File,
    io::{self, Read},
    os::fd::{AsRawFd, FromRawFd, OwnedFd},
    path::Path,
};

#[derive(Debug, PartialEq, Eq)]
pub enum FilesystemError {
    AuthorizationMismatch,
    Denied,
    InvalidResource,
    EscapeRejected,
    NotFound,
    NotAFile,
    TooLarge,
    Io,
}

impl fmt::Display for FilesystemError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::AuthorizationMismatch => "BROKER_AUTHORIZATION_MISMATCH",
            Self::Denied => "BROKER_REQUEST_DENIED",
            Self::InvalidResource => "INVALID_FILESYSTEM_RESOURCE",
            Self::EscapeRejected => "WORKSPACE_ESCAPE_REJECTED",
            Self::NotFound => "RESOURCE_NOT_FOUND",
            Self::NotAFile => "RESOURCE_NOT_A_FILE",
            Self::TooLarge => "RESOURCE_TOO_LARGE",
            Self::Io => "FILESYSTEM_BROKER_UNAVAILABLE",
        })
    }
}

impl std::error::Error for FilesystemError {}

/// Linux-only, read-only workspace broker. `openat2` resolves the complete path
/// beneath a pinned workspace directory descriptor, so validation and opening
/// are one kernel operation rather than a check-then-open sequence.
pub struct FilesystemBroker {
    root: OwnedFd,
    max_read_bytes: usize,
}

impl FilesystemBroker {
    pub fn open(root: impl AsRef<Path>, max_read_bytes: usize) -> Result<Self, FilesystemError> {
        let root = CString::new(root.as_ref().as_os_str().as_encoded_bytes())
            .map_err(|_| FilesystemError::InvalidResource)?;
        // SAFETY: `root` is a live NUL-terminated string and flags require no mode argument.
        let fd = unsafe {
            libc::open(
                root.as_ptr(),
                libc::O_PATH | libc::O_DIRECTORY | libc::O_CLOEXEC,
            )
        };
        if fd < 0 {
            return Err(map_io(io::Error::last_os_error()));
        }
        // SAFETY: `open` returned a new owned descriptor.
        let root = unsafe { OwnedFd::from_raw_fd(fd) };
        Ok(Self {
            root,
            max_read_bytes,
        })
    }

    pub fn read(
        &self,
        request: &PolicyRequest,
        decision: &Decision,
    ) -> Result<Vec<u8>, FilesystemError> {
        authorize_read(request, decision)?;
        let resource = normalized_relative_resource(&request.resource)?;
        let resource = CString::new(resource).map_err(|_| FilesystemError::InvalidResource)?;
        // `open_how` is non-exhaustive; zeroing is the kernel-defined initialization.
        let mut how: libc::open_how = unsafe { std::mem::zeroed() };
        how.flags = (libc::O_RDONLY | libc::O_CLOEXEC | libc::O_NOFOLLOW) as u64;
        how.resolve =
            libc::RESOLVE_BENEATH | libc::RESOLVE_NO_MAGICLINKS | libc::RESOLVE_NO_SYMLINKS;
        // SAFETY: arguments point to initialized values for the duration of the syscall.
        let fd = unsafe {
            libc::syscall(
                libc::SYS_openat2,
                self.root.as_raw_fd(),
                resource.as_ptr(),
                &how,
                size_of::<libc::open_how>(),
            ) as libc::c_int
        };
        if fd < 0 {
            return Err(map_openat2(io::Error::last_os_error()));
        }
        // SAFETY: `openat2` returned a new owned descriptor.
        let mut file = unsafe { File::from_raw_fd(fd) };
        if !file.metadata().map_err(|_| FilesystemError::Io)?.is_file() {
            return Err(FilesystemError::NotAFile);
        }
        let mut content = Vec::new();
        file.by_ref()
            .take(self.max_read_bytes as u64 + 1)
            .read_to_end(&mut content)
            .map_err(|_| FilesystemError::Io)?;
        if content.len() > self.max_read_bytes {
            return Err(FilesystemError::TooLarge);
        }
        Ok(content)
    }
}

fn authorize_read(request: &PolicyRequest, decision: &Decision) -> Result<(), FilesystemError> {
    if request.request_id != decision.request_id
        || request.policy_version != decision.policy_version
        || decision.audit_hash.is_none()
    {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if request.capability != Capability::Filesystem || request.action != "read" {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if decision.outcome != DecisionOutcome::Allow {
        return Err(FilesystemError::Denied);
    }
    Ok(())
}

fn normalized_relative_resource(resource: &str) -> Result<&str, FilesystemError> {
    let relative = resource
        .strip_prefix("workspace/")
        .ok_or(FilesystemError::InvalidResource)?;
    if relative.is_empty()
        || relative.starts_with('/')
        || relative
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        || relative.contains('\0')
        || relative.contains('\\')
    {
        return Err(FilesystemError::InvalidResource);
    }
    Ok(relative)
}

fn map_openat2(error: io::Error) -> FilesystemError {
    match error.raw_os_error() {
        Some(libc::ENOENT) => FilesystemError::NotFound,
        Some(code) if code == libc::ELOOP || code == libc::EXDEV => FilesystemError::EscapeRejected,
        _ => FilesystemError::Io,
    }
}

fn map_io(error: io::Error) -> FilesystemError {
    match error.kind() {
        io::ErrorKind::NotFound => FilesystemError::NotFound,
        _ => FilesystemError::Io,
    }
}
