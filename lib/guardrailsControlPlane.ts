import type { Capability, CapabilityGrant } from "@/lib/guardrailsPolicy";

export type PolicyTemplateId = "locked" | "review" | "package-audit";
type TemplateRequest = { id: string; capability: Capability; action: string; resource: string };

export function templateGrants(template: PolicyTemplateId, principalId: string, workspaceId: string, requests: readonly TemplateRequest[]): CapabilityGrant[] {
  const ids = template === "locked" ? ["source"] : template === "review" ? ["source", "command"] : ["source", "network"];
  return ids.map((id) => {
    const request = requests.find((item) => item.id === id);
    if (!request) throw new Error(`Policy template request is missing: ${id}`);
    return { id: `template-${template}-${id}`, principalId, workspaceId, capability: request.capability, actions: [request.action], resourcePattern: request.resource, effect: "allow", approval: request.capability === "process" ? "prompt" : "automatic" };
  });
}

export function brokerReceipt(requestId: string, outcome: string) {
  if (requestId === "source" || requestId === "secret") return `filesystem · canonical-path · ${outcome}`;
  if (requestId === "network") return `network · destination-and-redirect-bound · ${outcome}`;
  if (requestId === "command") return `command · executable-args-cwd-bound · ${outcome}`;
  return `credential · opaque-handle-only · ${outcome}`;
}
