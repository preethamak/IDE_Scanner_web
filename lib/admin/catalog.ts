export const adminSections = [
  { key: "users", group: "Users", title: "Analytics summary", description: "Consenting visitor sessions and signed-in activity by day.", source: "events" },
  { key: "users/all", group: "Users", title: "All users", description: "Registered accounts and their authentication provider.", source: "users" },
  { key: "users/paths", group: "Users", title: "User paths", description: "Page sequences within consenting visitor sessions.", source: "events" },
  { key: "users/referrers", group: "Users", title: "Referrers", description: "Referring hostnames. Full external URLs are never collected.", source: "events" },
  { key: "users/asn", group: "Users", title: "Network breakdown", description: "Autonomous system numbers supplied by Cloudflare.", source: "events" },
  { key: "users/locations", group: "Users", title: "Location breakdown", description: "Country-level traffic from Cloudflare. No precise location is stored.", source: "events" },
  { key: "users/devices", group: "Users", title: "Device breakdown", description: "Broad browser and device categories, without fingerprinting.", source: "events" },
  { key: "users/login", group: "Users", title: "Login events", description: "Successful D1 session creation; operational records, independent of visitor consent.", source: "events" },
  { key: "traffic/pages", group: "Traffic", title: "Pageview analytics", description: "Page views on normalized routes, excluding private identifiers and query strings.", source: "events" },
  { key: "traffic/utm", group: "Traffic", title: "Campaign analytics", description: "Campaign source, medium, and name from consenting visits.", source: "events" },
  { key: "engagements/queries", group: "Engagements", title: "Search & product activity", description: "Search submissions and product actions. Search text and report content are excluded.", source: "events" },
  { key: "engagements/shares", group: "Engagements", title: "Share analytics", description: "Share-link and badge-copy actions recorded after consent.", source: "events" },
  { key: "engagements/newsletter", group: "Engagements", title: "Newsletter", description: "Subscriber counts by source from the existing Supabase newsletter service.", source: "newsletter" },
  { key: "jobs", group: "System jobs", title: "Scan jobs", description: "Live scan queue and execution status from Abscissa’s private D1 database.", source: "jobs" },
  { key: "content", group: "Content", title: "Blog", description: "Write drafts, publish articles, and withdraw published articles.", source: "content" },
  { key: "mcp", group: "Integrations", title: "MCP analytics", description: "JSON-RPC method, response status, and latency. Arguments and results are excluded.", source: "events" },
  { key: "providers", group: "Integrations", title: "Provider analytics", description: "VS Marketplace, Open VSX, and Sarvam request health.", source: "events" },
  { key: "llm", group: "Integrations", title: "LLM analytics", description: "Sarvam model requests, latency, and HTTP status. Prompts and responses are excluded.", source: "events" },
  { key: "security", group: "Integrations", title: "Traffic risk", description: "Cloudflare bot scores when available; a score is a signal, not a fraud verdict.", source: "events" },
] as const;
export type AdminSection = typeof adminSections[number];
export function sectionByKey(key: string) { return adminSections.find(section => section.key === key); }
export const privateResponseHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
