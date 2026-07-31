type Alert = Record<string, unknown>;
export type JiraTarget = { site: string; email: string; api_token: string; project_key: string };

export function parseJiraTarget(value: string): JiraTarget {
  const parsed = JSON.parse(value) as Partial<JiraTarget>;
  if (!isJiraSite(String(parsed.site || "")) || !isEmail(String(parsed.email || "")) || !String(parsed.api_token || "") || !/^[A-Z][A-Z0-9_]{1,19}$/.test(String(parsed.project_key || ""))) throw new Error("Jira target is invalid.");
  return { site: String(parsed.site).replace(/\/$/, ""), email: String(parsed.email), api_token: String(parsed.api_token), project_key: String(parsed.project_key) };
}

export function isJiraSite(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.port && /^[-a-z0-9]+\.atlassian\.net$/i.test(url.hostname) && (url.pathname === "/" || url.pathname === ""); } catch { return false; }
}
export function jiraAuthorization(target: JiraTarget) { return `Basic ${Buffer.from(`${target.email}:${target.api_token}`).toString("base64")}`; }
export function jiraIssuePayload(alert: Alert, projectKey: string) {
  const extension = String(alert.extension_id || "extension"); const version = String(alert.version || ""); const severity = String(alert.severity || "INFORMATIONAL");
  const text = `${String(alert.summary || "")}\n\nArtifact: ${extension}@${version}\nAlert: ${String(alert.kind || "monitoring_alert")}`;
  return { fields: { project: { key: projectKey }, summary: `[GuardRails] ${severity}: ${String(alert.title || "Monitoring alert")}`, issuetype: { name: "Task" }, labels: ["guardrails-monitoring"], description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: text.slice(0, 30000) }] }] } } };
}

function isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
