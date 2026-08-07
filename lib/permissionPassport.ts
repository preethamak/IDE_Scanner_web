export const permissionCategoryIds = [
  "files",
  "terminal",
  "network",
  "secrets",
  "editor",
  "agents",
] as const;

export type PermissionCategoryId = (typeof permissionCategoryIds)[number];
export type PermissionCategory = {
  id: PermissionCategoryId;
  label: string;
  summary: string;
  state: "observed" | "not_observed" | "unknown";
  signals: string[];
};
export type PermissionPassportModel = {
  schema: "guardrails.permission-passport.v1";
  extension_id: string;
  analyzed_version: string;
  latest_version: string;
  freshness: "current" | "newer_release" | "pending" | "unavailable";
  scanned_at: string | null;
  artifact_sha256: string | null;
  categories: PermissionCategory[];
};

const definitions: Array<{
  id: PermissionCategoryId;
  label: string;
  summary: string;
  patterns: RegExp[];
}> = [
  {
    id: "files",
    label: "Files",
    summary: "Workspace and filesystem access",
    patterns: [/file/, /filesystem/, /workspace/, /read/, /write/, /path/],
  },
  {
    id: "terminal",
    label: "Terminal",
    summary: "Commands, processes, and install scripts",
    patterns: [
      /shell/,
      /process/,
      /terminal/,
      /command/,
      /exec/,
      /spawn/,
      /lifecycle/,
    ],
  },
  {
    id: "network",
    label: "Network",
    summary: "Outbound connections and remote services",
    patterns: [
      /network/,
      /http/,
      /socket/,
      /request/,
      /download/,
      /remote/,
      /egress/,
    ],
  },
  {
    id: "secrets",
    label: "Secrets",
    summary: "Credentials, environment, and sensitive configuration",
    patterns: [
      /secret/,
      /credential/,
      /token/,
      /password/,
      /environment/,
      /env/,
      /keychain/,
    ],
  },
  {
    id: "editor",
    label: "Editor",
    summary: "Editor commands, webviews, and user interaction",
    patterns: [
      /editor/,
      /vscode/,
      /webview/,
      /clipboard/,
      /selection/,
      /document/,
      /contribution/,
    ],
  },
  {
    id: "agents",
    label: "Agents & tools",
    summary: "AI models, autonomous tools, MCP, and delegation",
    patterns: [
      /agent/,
      /model/,
      /chat/,
      /mcp/,
      /tool/,
      /language.server/,
      /copilot/,
      /ai/,
    ],
  },
];

export function buildPermissionPassport(input: {
  extensionId: string;
  version: string;
  latestVersion?: string | null;
  scan?: Record<string, unknown> | null;
}): PermissionPassportModel {
  const scan = input.scan || null;
  const capabilityKeys = scan ? extractCapabilityKeys(scan) : [];
  const analysisStatus = String(scan?.analysis_status || "");
  const analyzed = Boolean(scan?.id);
  const latestVersion = input.latestVersion || input.version;
  const freshness: PermissionPassportModel["freshness"] = !analyzed
    ? "unavailable"
    : analysisStatus && analysisStatus !== "complete"
      ? "pending"
      : latestVersion !== input.version
        ? "newer_release"
        : "current";
  return {
    schema: "guardrails.permission-passport.v1",
    extension_id: input.extensionId,
    analyzed_version: input.version,
    latest_version: latestVersion,
    freshness,
    scanned_at: text(scan?.scanned_at) || text(scan?.created_at),
    artifact_sha256: text(scan?.artifact_sha256),
    categories: definitions.map((definition) => {
      const signals = capabilityKeys.filter((key) =>
        definition.patterns.some((pattern) => pattern.test(key.toLowerCase())),
      );
      return {
        id: definition.id,
        label: definition.label,
        summary: definition.summary,
        state: !scan ? "unknown" : signals.length ? "observed" : "not_observed",
        signals: signals.map(humanize).slice(0, 4),
      };
    }),
  };
}

export function categoryForCapability(
  value: string,
): PermissionCategoryId | null {
  const normalized = value.toLowerCase();
  return (
    definitions.find((definition) =>
      definition.patterns.some((pattern) => pattern.test(normalized)),
    )?.id || null
  );
}

function extractCapabilityKeys(scan: Record<string, unknown>) {
  const capabilities = object(scan.capabilities);
  const assessment = object(scan.capability_assessment);
  const matched = Array.isArray(assessment.matched)
    ? assessment.matched.map(String)
    : [];
  return [...new Set([...Object.keys(capabilities), ...matched])].filter(
    Boolean,
  );
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
