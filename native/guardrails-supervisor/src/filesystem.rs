use crate::{Capability, Decision, DecisionOutcome, PolicyRequest};
use std::{
    ffi::CString,
    fmt,
    fs::File,
    io::{self, Read, Write},
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
    AlreadyExists,
    NotAFile,
    TooLarge,
    SensitiveAuthorizationRequired,
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
            Self::AlreadyExists => "RESOURCE_ALREADY_EXISTS",
            Self::NotAFile => "RESOURCE_NOT_A_FILE",
            Self::TooLarge => "RESOURCE_TOO_LARGE",
            Self::SensitiveAuthorizationRequired => "SENSITIVE_RESOURCE_AUTHORIZATION_REQUIRED",
            Self::Io => "FILESYSTEM_BROKER_UNAVAILABLE",
        })
    }
}

impl std::error::Error for FilesystemError {}

/// Linux-only workspace broker. `openat2` resolves the complete path
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
        if is_sensitive_resource(resource) {
            return Err(FilesystemError::SensitiveAuthorizationRequired);
        }
        self.read_resource(resource)
    }

    /// Reads a classified credential-bearing file only when a separate
    /// `secret/read` decision authorizes the same principal, workspace, policy
    /// version, and resource. The filesystem decision alone is insufficient.
    pub fn read_sensitive(
        &self,
        request: &PolicyRequest,
        filesystem_decision: &Decision,
        sensitive_request: &PolicyRequest,
        sensitive_decision: &Decision,
    ) -> Result<Vec<u8>, FilesystemError> {
        authorize_read(request, filesystem_decision)?;
        let resource = normalized_relative_resource(&request.resource)?;
        if !is_sensitive_resource(resource) {
            return Err(FilesystemError::AuthorizationMismatch);
        }
        authorize_sensitive_read(request, sensitive_request, sensitive_decision)?;
        self.read_resource(resource)
    }

    /// Creates a new, non-sensitive workspace file after an exact
    /// `filesystem/write` decision. Existing files are never overwritten;
    /// replacement and sensitive-file creation require separate operations.
    pub fn create(
        &self,
        request: &PolicyRequest,
        decision: &Decision,
        content: &[u8],
    ) -> Result<(), FilesystemError> {
        authorize_write(request, decision)?;
        if content.len() > self.max_read_bytes {
            return Err(FilesystemError::TooLarge);
        }
        let resource = normalized_relative_resource(&request.resource)?;
        if is_sensitive_resource(resource) {
            return Err(FilesystemError::SensitiveAuthorizationRequired);
        }
        let resource = CString::new(resource).map_err(|_| FilesystemError::InvalidResource)?;
        let mut how: libc::open_how = unsafe { std::mem::zeroed() };
        how.flags =
            (libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL | libc::O_CLOEXEC | libc::O_NOFOLLOW)
                as u64;
        how.mode = 0o600;
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
        file.write_all(content).map_err(|_| FilesystemError::Io)?;
        file.sync_all().map_err(|_| FilesystemError::Io)
    }

    /// Deletes one existing, non-sensitive regular file after an exact
    /// `filesystem/delete` decision. It never recurses, follows symlinks, or
    /// removes directories.
    pub fn delete(
        &self,
        request: &PolicyRequest,
        decision: &Decision,
    ) -> Result<(), FilesystemError> {
        authorize_delete(request, decision)?;
        let resource = normalized_relative_resource(&request.resource)?;
        if is_sensitive_resource(resource) {
            return Err(FilesystemError::SensitiveAuthorizationRequired);
        }
        let (parent, name) = resource
            .rsplit_once('/')
            .map_or((".", resource), |(parent, name)| (parent, name));
        let parent = self.open_directory(parent)?;
        let name = CString::new(name).map_err(|_| FilesystemError::InvalidResource)?;
        let mut metadata: libc::stat = unsafe { std::mem::zeroed() };
        // SAFETY: parent is a live directory descriptor, and name is a
        // NUL-terminated path component validated by normalized_resource.
        let stat_result = unsafe {
            libc::fstatat(
                parent.as_raw_fd(),
                name.as_ptr(),
                &mut metadata,
                libc::AT_SYMLINK_NOFOLLOW,
            )
        };
        if stat_result < 0 {
            return Err(map_openat2(io::Error::last_os_error()));
        }
        if metadata.st_mode & libc::S_IFMT != libc::S_IFREG {
            return Err(if metadata.st_mode & libc::S_IFMT == libc::S_IFLNK {
                FilesystemError::EscapeRejected
            } else {
                FilesystemError::NotAFile
            });
        }
        // SAFETY: the path component is resolved against the pinned parent
        // descriptor, and `0` prevents directory removal.
        let unlink_result = unsafe { libc::unlinkat(parent.as_raw_fd(), name.as_ptr(), 0) };
        if unlink_result < 0 {
            return Err(map_openat2(io::Error::last_os_error()));
        }
        // Persist the directory entry change before reporting success.
        let sync_result = unsafe { libc::fsync(parent.as_raw_fd()) };
        if sync_result < 0 {
            return Err(FilesystemError::Io);
        }
        Ok(())
    }

    fn open_directory(&self, resource: &str) -> Result<OwnedFd, FilesystemError> {
        let resource = CString::new(resource).map_err(|_| FilesystemError::InvalidResource)?;
        let mut how: libc::open_how = unsafe { std::mem::zeroed() };
        how.flags = (libc::O_RDONLY | libc::O_DIRECTORY | libc::O_CLOEXEC | libc::O_NOFOLLOW) as u64;
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
        // SAFETY: openat2 returned a new owned descriptor.
        Ok(unsafe { OwnedFd::from_raw_fd(fd) })
    }

    fn read_resource(&self, resource: &str) -> Result<Vec<u8>, FilesystemError> {
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
        Read::by_ref(&mut file)
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

fn authorize_write(request: &PolicyRequest, decision: &Decision) -> Result<(), FilesystemError> {
    if request.request_id != decision.request_id
        || request.policy_version != decision.policy_version
        || decision.audit_hash.is_none()
    {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if request.capability != Capability::Filesystem || request.action != "write" {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if decision.outcome != DecisionOutcome::Allow {
        return Err(FilesystemError::Denied);
    }
    Ok(())
}

fn authorize_delete(request: &PolicyRequest, decision: &Decision) -> Result<(), FilesystemError> {
    if request.request_id != decision.request_id
        || request.policy_version != decision.policy_version
        || decision.audit_hash.is_none()
    {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if request.capability != Capability::Filesystem || request.action != "delete" {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if decision.outcome != DecisionOutcome::Allow {
        return Err(FilesystemError::Denied);
    }
    Ok(())
}

fn authorize_sensitive_read(
    filesystem_request: &PolicyRequest,
    sensitive_request: &PolicyRequest,
    decision: &Decision,
) -> Result<(), FilesystemError> {
    if sensitive_request.workspace_id != filesystem_request.workspace_id
        || sensitive_request.principal != filesystem_request.principal
        || sensitive_request.delegation_chain != filesystem_request.delegation_chain
        || sensitive_request.resource != filesystem_request.resource
        || sensitive_request.policy_version != filesystem_request.policy_version
        || sensitive_request.capability != Capability::Secret
        || sensitive_request.action != "read"
        || sensitive_request.request_id == filesystem_request.request_id
    {
        return Err(FilesystemError::AuthorizationMismatch);
    }
    if decision.request_id != sensitive_request.request_id
        || decision.policy_version != sensitive_request.policy_version
        || decision.audit_hash.is_none()
    {
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

fn is_sensitive_resource(resource: &str) -> bool {
    let name = resource
        .rsplit('/')
        .next()
        .unwrap_or(resource)
        .to_ascii_lowercase();
    name == ".env"
        || (name.starts_with(".env.") && name != ".env.example")
        || matches!(
            name.as_str(),
            ".npmrc"
                | ".pypirc"
                | ".netrc"
                | "credentials.json"
                | "id_rsa"
                | "id_ecdsa"
                | "id_ed25519"
        )
        || name.ends_with(".pem")
        || name.ends_with(".key")
}

fn map_openat2(error: io::Error) -> FilesystemError {
    match error.raw_os_error() {
        Some(libc::ENOENT) => FilesystemError::NotFound,
        Some(libc::EEXIST) => FilesystemError::AlreadyExists,
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
