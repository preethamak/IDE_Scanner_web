/** Never retain private path segments, query parameters, or arbitrary event payloads. */
export function analyticsPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/other";
  const path = value.split(/[?#]/, 1)[0].slice(0, 500);
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "/";
  if (["admin", "api"].includes(parts[0])) return "/excluded";
  const staticRoots = ["about", "account", "analyze", "badge", "benchmark", "blog", "catalog", "changelog", "cli", "compare", "contact", "detections", "docs", "extensions", "faq", "guides", "ide", "integrations", "mcp", "metrics", "monitor", "pricing", "privacy", "publishers", "registry", "reports", "research", "security", "settings", "solutions", "status", "terms", "workspace"];
  if (!staticRoots.includes(parts[0])) return "/other";
  // Group dynamic routes, including public package identities: no arbitrary URL data.
  if (["extensions", "reports", "publishers", "workspace", "account"].includes(parts[0])) return `/${parts[0]}${parts.length > 1 ? "/[detail]" : ""}`;
  return `/${parts[0]}${parts.length > 1 ? "/[page]" : ""}`;
}
export function campaignValue(value: unknown): string {
  return typeof value === "string" && /^[a-z0-9_.-]{1,80}$/i.test(value) ? value : "";
}
export function referrerHost(value: unknown): string {
  try { const url = new URL(String(value)); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.hostname.slice(0, 200) : ""; } catch { return ""; }
}
export function boundedNumber(value: unknown, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0;
}
export function sameOrigin(request: Request): boolean {
  // OpenNext may reconstruct a local/internal hostname in Request.url.
  // Host is the browser-facing HTTP authority; scripts cannot override it in
  // a cross-origin browser request. Preserve the request scheme and port.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  return request.headers.get("origin") === `${url.protocol}//${host}`;
}
export async function boundedJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("JSON is required.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
  const result: unknown = JSON.parse(new TextDecoder().decode(joined));
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("A JSON object is required.");
  return result as Record<string, unknown>;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
