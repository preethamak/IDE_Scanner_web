export type McpDirectoryEntry = {
  name: string;
  title: string;
  description: string;
  version: string;
  remotes: { type: string; url: string }[];
  repositoryUrl: string;
  websiteUrl: string;
  status: string;
};

const DEFAULT_REGISTRY_URL = "https://registry.modelcontextprotocol.io/v0/servers";

export async function loadMcpDirectory(limit = 24): Promise<McpDirectoryEntry[]> {
  const base = process.env.MCP_SERVER_REGISTRY_URL || DEFAULT_REGISTRY_URL;
  const url = new URL(base);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const payload = await response.json() as { servers?: unknown[] };
    return (payload.servers || []).map(normalizeDirectoryEntry).filter((item): item is McpDirectoryEntry => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeDirectoryEntry(value: unknown): McpDirectoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const wrapper = value as Record<string, unknown>;
  const server = wrapper.server && typeof wrapper.server === "object" ? wrapper.server as Record<string, unknown> : wrapper;
  const remotes = Array.isArray(server.remotes)
    ? server.remotes.flatMap((remote) => {
        if (!remote || typeof remote !== "object") return [];
        const item = remote as Record<string, unknown>;
        return typeof item.url === "string" ? [{ type: String(item.type || "remote"), url: item.url }] : [];
      })
    : [];
  const name = String(server.name || "").trim();
  if (!name) return null;
  const repository = server.repository && typeof server.repository === "object" ? server.repository as Record<string, unknown> : {};
  const meta = wrapper._meta && typeof wrapper._meta === "object" ? wrapper._meta as Record<string, unknown> : {};
  const official = meta["io.modelcontextprotocol.registry/official"];
  const officialMeta = official && typeof official === "object" ? official as Record<string, unknown> : {};
  return {
    name,
    title: String(server.title || name),
    description: String(server.description || "No description supplied."),
    version: String(server.version || "Unversioned"),
    remotes,
    repositoryUrl: String(repository.url || ""),
    websiteUrl: String(server.websiteUrl || server.website || ""),
    status: String(officialMeta.status || "listed"),
  };
}
