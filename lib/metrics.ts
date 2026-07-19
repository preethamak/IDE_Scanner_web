export type MetricDomain = { id: string; label: string; short: string; detail: string; why: string; outputs: string[] };
export type RuleReference = { id: string; title: string; category: string; evidence: string; severity: string; engine: string; description: string };
export const RULESET_VERSION = "2026.07.19";

export const metricCatalog: MetricDomain[] = [
  { id: "confirmed-intelligence", label: "Confirmed intelligence", short: "Known-bad artifacts and malicious dependencies.", detail: "Exact package and file SHA-256 matches, configured threat intelligence, and dependencies identified as malicious.", why: "This is authoritative evidence and can directly drive a BLOCK decision when the intelligence source and artifact identity are valid.", outputs: ["artifact SHA-256", "feed source", "matched dependency"] },
  { id: "behavior-chains", label: "Behavior chains", short: "Sources connected to security-sensitive sinks.", detail: "Workspace input, webview messages, decoded payloads, credential surfaces, downloads, process execution, filesystem access, and outbound network transfer.", why: "Correlation is stronger than counting isolated API names. A source-to-sink path explains how a capability could become abuse.", outputs: ["source", "sink", "file and line", "correlation rule"] },
  { id: "code-evasion", label: "Code and evasion", short: "Dynamic calls, constructed arguments, and hidden content.", detail: "AST-resolved bracket notation, computed call targets, encoded dynamic execution, invisible Unicode controls, obfuscation, and dynamic code loading.", why: "Attackers can evade plain-text matching. Structural parsing and signatures recover signals that regex alone misses.", outputs: ["AST node", "resolved value", "YARA match", "code location"] },
  { id: "capability-surface", label: "Capability surface", short: "What extension code is able to reach.", detail: "Process execution, shell invocation, network and filesystem access, install scripts, agent tooling, native code, and packed artifacts.", why: "Capability is not proof of intent, but it defines blast radius and tells reviewers where explicit user intent and isolation are required.", outputs: ["capability", "activation context", "entrypoint", "review guidance"] },
  { id: "credential-exposure", label: "Credential and data exposure", short: "Secret capture, storage, control, and transfer paths.", detail: "Credential prompts and configuration keys, extension state storage, command surfaces, clipboard access, and flows into files, processes, or networks.", why: "IDE extensions share a privileged user environment. Insecure storage and cross-extension control can expose secrets even without malware.", outputs: ["secret source", "storage surface", "control surface", "transfer sink"] },
  { id: "dependencies", label: "Dependency security", short: "Malicious or vulnerable runtime packages.", detail: "Runtime dependency inventory is checked against configured vulnerability and malicious-package intelligence.", why: "A clean extension entrypoint can still inherit exploitable or malicious behavior through its dependency graph.", outputs: ["package", "version", "advisory", "fix version"] },
  { id: "artifact-provenance", label: "Artifact and provenance", short: "The exact bytes, packaging, and marketplace history.", detail: "Package and file hashes, native and packed payloads, embedded PE content, and marketplace removal signals.", why: "A name or repository is not the artifact. Exact hashes and packaging evidence make a decision reproducible across machines and releases.", outputs: ["package hash", "file hashes", "artifact type", "marketplace signal"] },
  { id: "agentic", label: "AI, agent, and MCP", short: "Tools that let models act inside the IDE.", detail: "Language-model tools, chat participants, MCP server surfaces, agent data access, and network or execution combinations.", why: "Agent tools turn prompts into actions. Their approval, filesystem, terminal, and network boundaries need explicit review.", outputs: ["tool contribution", "MCP surface", "data access", "action sink"] },
  { id: "webview", label: "Webview boundaries", short: "Browser-like messages entering extension privileges.", detail: "Message events from webviews are traced toward process execution and other privileged extension APIs.", why: "A webview is a lower-trust input boundary; schema validation and narrow message handlers are essential.", outputs: ["message source", "handler", "execution sink", "location"] },
  { id: "client-posture", label: "IDE client posture", short: "Whether local settings weaken IDE guardrails.", detail: "Workspace Trust, broad trusted paths, automatic tasks, agent auto-approval, terminal and URL approval rules, and untrusted-workspace overrides.", why: "Extension findings answer what a package can do. Posture metrics answer whether local policy makes that behavior easier to trigger.", outputs: ["control status", "0-100 posture pressure", "client", "remediation"] },
  { id: "analysis-coverage", label: "Analysis coverage", short: "What was inspected, skipped, or unsupported.", detail: "Declared and discovered entrypoints, files inspected, provider availability, parse failures, truncation, archive limits, and unsupported native code.", why: "No findings is meaningful only when coverage is complete. Missing mandatory analysis produces INCOMPLETE, not ALLOW.", outputs: ["entrypoint coverage", "provider status", "skipped files", "completion state"] },
  { id: "release-change", label: "Release change", short: "What changed since the trusted baseline.", detail: "Decisions, findings, capabilities, dependencies, entrypoints, file hashes, and package identity are compared between versions.", why: "Trust is version-specific. A low-risk update can add one new execution path or replace a binary without changing the product name.", outputs: ["new findings", "removed findings", "capability delta", "hash delta"] }
];

const rule = (id: string, title: string, category: string, evidence: string, severity: string, engine: string, description: string): RuleReference => ({ id, title, category, evidence, severity, engine, description });

export const ruleCatalog: RuleReference[] = [
  rule("known-bad-artifact", "Known-bad artifact", "confirmed intelligence", "confirmed", "CRITICAL", "intelligence", "Exact package or file hash matched configured malicious intelligence."),
  rule("malicious-npm-dependency", "Malicious npm dependency", "dependency", "confirmed", "CRITICAL", "dependency intelligence", "A runtime dependency is identified as a malicious package."),
  rule("marketplace-removed-package", "Marketplace removed package", "provenance", "provenance", "HIGH", "marketplace intelligence", "The package appears in a marketplace removal list."),
  rule("vulnerable-npm-dependency", "Vulnerable npm dependency", "dependency", "dependency", "HIGH", "dependency intelligence", "Runtime dependency intelligence reports a known vulnerability."),
  rule("untrusted-workspace-input-to-process", "Workspace input reaches process execution", "execution", "capability", "MEDIUM", "Semgrep", "Workspace or user configuration reaches a process execution API; common developer-tool behavior that requires shell and trust context."),
  rule("webview-message-to-process", "Webview message reaches execution", "webview", "correlated", "HIGH", "Semgrep", "Webview-controlled message data reaches process execution."),
  rule("decoded-payload-execution", "Decoded payload reaches dynamic execution", "code", "correlated", "HIGH", "Semgrep", "Decoded or deobfuscated data flows into dynamic execution."),
  rule("encoded-dynamic-execution", "Encoded dynamic execution", "code", "correlated", "HIGH", "YARA", "Encoded payload handling appears with dynamic execution markers."),
  rule("unicode-evasion", "Unicode source-code evasion", "code", "weak", "MEDIUM", "YARA", "Executable content contains bidirectional or invisible Unicode controls."),
  rule("embedded-pe-artifact", "Embedded portable executable", "artifact", "provenance", "MEDIUM", "YARA", "Portable executable content is embedded inside another artifact."),
  rule("ast-bracket-notation-sensitive-access", "Bracket access to sensitive global", "code", "capability", "HIGH", "AST", "Computed bracket notation resolves to eval, Function, require, or child_process."),
  rule("ast-constructed-dynamic-argument", "Constructed argument to dynamic sink", "code", "capability", "HIGH", "AST", "A dynamic execution argument is assembled at runtime to hide a suspicious target."),
  rule("ast-dynamic-call-target", "Dynamic call target", "execution", "capability", "MEDIUM", "AST", "A computed member is invoked instead of a literal function target."),
  rule("credential-dataflow-to-network", "Credential data flow to network", "credential exposure", "correlated", "CRITICAL", "native correlation", "Credential-related sources occur with outbound network sinks."),
  rule("credential-dataflow-to-file", "Credential data flow to file", "credential exposure", "correlated", "HIGH", "native correlation", "Credential-related sources occur with file writes."),
  rule("credential-dataflow-to-process", "Credential data flow to process", "credential exposure", "correlated", "HIGH", "native correlation", "Credential-related sources occur with process execution."),
  rule("credential-exfiltration-chain", "Credential exfiltration chain", "credential access", "correlated", "HIGH", "native correlation", "Credential references, local reads, and outbound transfer occur together."),
  rule("clipboard-read-near-secret-input", "Clipboard read near secret input", "credential exposure", "correlated", "HIGH", "native correlation", "Clipboard reads occur near credential input or storage surfaces."),
  rule("credential-command-control", "Credential command control", "credential exposure", "correlated", "HIGH", "native correlation", "Credential input appears near cross-extension command or state control."),
  rule("credential-config-update", "Credential configuration storage", "credential exposure", "exposure", "HIGH", "native static", "Credential-related values are written to VS Code configuration."),
  rule("credential-global-state-storage", "Credential global state storage", "credential exposure", "exposure", "HIGH", "native static", "Credential-related values are written to global or workspace state."),
  rule("credential-inputbox-prompt", "Credential InputBox prompt", "credential exposure", "exposure", "MEDIUM", "native static", "An InputBox appears to request credential material."),
  rule("credential-command-execution", "Credential command execution", "credential exposure", "exposure", "MEDIUM", "native static", "A credential-related VS Code command is executed."),
  rule("credential-config-key", "Credential configuration key", "credential exposure", "exposure", "LOW", "manifest/static", "Configuration keys or descriptions appear credential-related."),
  rule("credential-global-state-key", "Credential global state key", "credential exposure", "exposure", "LOW", "native static", "Extension state keys appear credential-related."),
  rule("credential-command-registration", "Credential command registration", "credential exposure", "exposure", "LOW", "manifest/static", "A contributed command identifier or label appears credential-related."),
  rule("agent-data-exfil-chain", "Agent data exfiltration chain", "agentic", "correlated", "HIGH", "native correlation", "Agent-facing code, sensitive references, and outbound network behavior occur together."),
  rule("agentic-tooling", "Agent-facing IDE capability", "agentic", "capability", "MEDIUM", "manifest", "The extension contributes model tools, chat participants, or MCP surfaces."),
  rule("download-and-execute", "Download and execute", "execution", "correlated", "HIGH", "native correlation", "A source file combines network download and local process execution."),
  rule("lifecycle-script", "Lifecycle script", "supply chain", "capability", "MEDIUM", "manifest", "The package defines install or uninstall lifecycle scripts."),
  rule("native-or-packed-artifact", "Native or packed artifact", "artifact", "capability", "MEDIUM", "artifact inspection", "The package contains native binaries or packed archives."),
  rule("dynamic-shell-execution", "Dynamic shell execution", "execution", "capability", "MEDIUM", "native static", "Code invokes a shell-style process execution API."),
  rule("untrusted-input-execution", "Untrusted input execution", "execution", "capability", "MEDIUM", "native correlation", "IDE or workspace input appears with process execution."),
  rule("dynamic-code-loading", "Dynamic code loading", "code", "weak", "MEDIUM", "native static", "Code uses dynamic loading or evaluation patterns."),
  rule("destructive-file-pattern", "Destructive file pattern", "filesystem", "weak", "MEDIUM", "native static", "Code contains destructive file-operation patterns."),
  rule("safe-configured-cli-execution", "Configured CLI execution", "execution", "weak", "INFO", "native static", "A configured local CLI is invoked with execFile-style execution."),
  rule("filesystem-access", "Filesystem access", "filesystem", "weak", "LOW", "native static", "Code reads or writes local files; common in developer tools."),
  rule("network-access", "Network access", "network", "weak", "LOW", "native static", "Code performs network requests; not malicious by itself."),
  rule("obfuscation", "Obfuscation", "code", "weak", "LOW", "native static", "Source contains obfuscation indicators."),
  rule("process-execution", "Process execution", "execution", "weak", "LOW", "native static", "Code can spawn local processes; common for language servers and debuggers.")
];

export const evidenceClasses = [
  ["confirmed", "Authoritative artifact or package intelligence. May directly drive BLOCK."],
  ["correlated", "Multiple related signals or a source-to-sink path. Usually drives REVIEW and may block under strict policy."],
  ["observed", "Behavior recorded by an external controlled analysis provider. Not produced by the hosted static path."],
  ["dependency", "Known vulnerability or package intelligence attached to a resolved runtime dependency."],
  ["provenance", "Artifact, marketplace, repository, or release-origin evidence."],
  ["capability", "A sensitive power or structural behavior that requires context and user-intent review."],
  ["exposure", "A secret storage, input, command, or cross-extension boundary that may weaken isolation."],
  ["weak", "A single common static indicator. Context only; never sufficient for a malware claim by itself."]
];
