const LOCAL_ICON_PREFIXES = ["/", "data:", "blob:"];
const TRUSTED_ICON_HOSTS = [
  "marketplace.visualstudio.com",
  "open-vsx.org",
  ".open-vsx.org",
  ".vsassets.io",
];

export function extensionIconCandidates(iconUrl?: string | null): string[] {
  const source = String(iconUrl || "").trim();
  if (!source) return [];
  if (LOCAL_ICON_PREFIXES.some((prefix) => source.startsWith(prefix))) {
    return [source];
  }
  try {
    const parsed = new URL(source);
    if (!isTrustedExtensionIconUrl(parsed)) return [];
    return [
      `/api/extension-icons?url=${encodeURIComponent(parsed.toString())}`,
      parsed.toString(),
    ];
  } catch {
    return [];
  }
}

export function isTrustedExtensionIconUrl(url: URL) {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return TRUSTED_ICON_HOSTS.some((allowed) =>
    allowed.startsWith(".") ? host.endsWith(allowed) : host === allowed,
  );
}

export function extensionInitials(publisher: string, name = "") {
  return (
    (publisher || name || "EX")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "EX"
  );
}
