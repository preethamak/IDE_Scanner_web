import { describe, expect, it } from "vitest";
import { isJiraSite, jiraIssuePayload, parseJiraTarget } from "@/lib/jiraNotification";

describe("Jira Cloud notifications", () => {
  it("accepts only a direct Atlassian Cloud site and a bounded project key", () => {
    expect(isJiraSite("https://guardrails.atlassian.net")).toBe(true);
    expect(isJiraSite("https://guardrails.atlassian.net/rest/api/3")).toBe(false);
    expect(() => parseJiraTarget(JSON.stringify({ site: "https://guardrails.atlassian.net", email: "security@example.com", api_token: "token", project_key: "SEC" }))).not.toThrow();
    expect(() => parseJiraTarget(JSON.stringify({ site: "https://guardrails.atlassian.net", email: "security@example.com", api_token: "token", project_key: "bad key" }))).toThrow();
  });
  it("creates a bounded Atlassian document issue payload", () => {
    const payload = jiraIssuePayload({ title: "Review evidence", summary: "A scan changed", extension_id: "GitHub.copilot", version: "1.388.0", severity: "HIGH", kind: "review_required" }, "SEC");
    expect(payload).toMatchObject({ fields: { project: { key: "SEC" }, issuetype: { name: "Task" }, labels: ["guardrails-monitoring"] } });
  });
});
