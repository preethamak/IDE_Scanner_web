import { NextResponse } from "next/server";
import { rankAlternatives } from "@/lib/alternatives";
import { isValidGateCheck, lookupGateVerdict } from "@/lib/gateLookup";
import { getBadgeDecision, getPublicInventory } from "@/lib/productData";
import { publicDb } from "@/lib/supabase";
import { deriveTrustTier } from "@/lib/trustTiers";
import { validBearerSecret } from "@/lib/internalRunnerAuth";
import { runtimeEnv } from "@/lib/runtimeEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MCP server (Streamable HTTP, stateless) for AI agents.
// Implements the JSON-RPC 2.0 subset the protocol requires — initialize,
// notifications/initialized, tools/list, tools/call — without an SDK
// dependency. Every POST is self-contained; no session state is kept.

const PROTOCOL_VERSION = "2025-06-18";
const EXTENSION_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;
const MAX_BODY_BYTES = 64 * 1024;
const MCP_ACCESS_TOKEN_ENV = "MCP_ACCESS_TOKEN";

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc?: unknown; id?: JsonRpcId; method?: unknown; params?: unknown };

const TOOLS = [
  {
    name: "check_extension_risk",
    title: "Check extension risk",
    description:
      "Check the GuardRails public analysis verdict for an IDE extension before recommending or installing it. Returns the decision (allow/review/block), severity, public outcome, analysis coverage, a report URL, and a one-line recommendation. Pass a version to check the exact release; omit it to check the latest analyzed release.",
    inputSchema: {
      type: "object",
      properties: {
        extension: { type: "string", description: "Extension id in publisher.name form, e.g. ms-python.python" },
        version: { type: "string", description: "Exact release version, e.g. 1.2.3. Optional; defaults to the latest analyzed release." },
      },
      required: ["extension"],
    },
    outputSchema: {
      type: "object",
      required: ["extension", "version", "verdict", "recommendation"],
      properties: {
        extension: { type: "string" },
        version: { type: ["string", "null"] },
        verdict: { type: "string", enum: ["pass", "fail", "unreviewed"] },
        recommendation: { type: "string", enum: ["safe to recommend", "needs human review", "do not recommend"] },
        report_url: { type: ["string", "null"] },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "find_reputable_alternatives",
    title: "Find reputable alternatives",
    description:
      "Search the GuardRails public inventory for analyzed extensions matching a keyword query (name, publisher, or description) and return up to five ranked by reputability: allowed decisions first, then trust tier, verified publisher, and lower severity. Use this to suggest a safer alternative when an extension from an unknown publisher looks risky.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords describing the extension category, e.g. 'python linter'" },
      },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      required: ["query", "alternatives"],
      properties: {
        query: { type: "string" },
        alternatives: { type: "array" },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
] as const;

export async function GET() {
  return NextResponse.json(
    { error: "This MCP endpoint is stateless; use POST with JSON-RPC 2.0 messages." },
    { status: 405, headers: { Allow: "POST, OPTIONS" } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

export async function POST(request: Request) {
  const authorization = authorize(request);
  if (authorization) return authorization;
  if (contentLength(request) > MAX_BODY_BYTES) return rpcError(null, -32600, "Invalid request: body exceeds 64 KiB.", 413);
  let message: JsonRpcRequest;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return rpcError(null, -32600, "Invalid request: body exceeds 64 KiB.", 413);
    message = JSON.parse(raw) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error: request body must be JSON.");
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return rpcError(null, -32600, "Invalid request: batch messages are not supported.");
  }
  const id = message.id === undefined ? null : message.id;
  const method = typeof message.method === "string" ? message.method : "";
  const params = (message.params && typeof message.params === "object" ? message.params : {}) as Record<string, unknown>;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "guardrails", version: "1.1.0" },
        instructions:
          "Read-only public extension intelligence. Check a candidate before recommending it. An unreviewed result is not approval; link the exact report for a human decision. Early-access limits: 64 KiB request bodies and no write operations.",
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      // Notifications carry no id and expect no body.
      return new Response(null, { status: 202 });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call":
      return handleToolCall(id, params, request);
    default:
      return rpcError(id, -32601, `Method not found: ${method || "(missing)"}`);
  }
}

async function handleToolCall(id: JsonRpcId, params: Record<string, unknown>, request: Request) {
  const name = String(params.name || "");
  const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
  const origin = new URL(request.url).origin;
  try {
    if (name === "check_extension_risk") return rpcResult(id, await checkExtensionRisk(args, origin));
    if (name === "find_reputable_alternatives") return rpcResult(id, await findReputableAlternatives(args, origin));
    return rpcError(id, -32602, `Unknown tool: ${name || "(missing)"}`);
  } catch {
    return rpcResult(id, toolError("The analysis backend is temporarily unavailable. Try again shortly."));
  }
}

function recommendation(decision: string | null, verdict?: string): string {
  if (decision === "allow") return "safe to recommend";
  if (decision === "block" || verdict === "fail") return "do not recommend";
  return "needs human review";
}

async function checkExtensionRisk(args: Record<string, unknown>, origin: string) {
  const extension = String(args.extension || "").trim();
  const version = String(args.version || "").trim();
  if (!EXTENSION_PATTERN.test(extension)) {
    return toolError("Provide extension as publisher.name, e.g. ms-python.python.");
  }

  if (version) {
    const check = { extension, version };
    if (!isValidGateCheck(check)) return toolError("Provide a valid version string, e.g. 1.2.3.");
    const db = publicDb();
    if (!db) return toolError("The analysis backend is unavailable.");
    const result = await lookupGateVerdict(db, check, false);
    return toolJson({
      extension,
      version,
      verdict: result.verdict,
      decision: result.decision,
      severity: result.severity,
      public_outcome: result.public_outcome,
      coverage_percent: result.coverage_percent,
      reason: result.reason,
      report_url: result.report ? `${origin}${result.report}` : null,
      recommendation:
        result.verdict === "unreviewed"
          ? "needs human review"
          : recommendation(result.decision, result.verdict),
    });
  }

  const decision = await getBadgeDecision(extension);
  if (!decision.found || !decision.decision) {
    return toolJson({
      extension,
      version: null,
      verdict: "unreviewed",
      decision: null,
      severity: null,
      public_outcome: null,
      reason: "No completed public analysis exists for this extension. This is not an approval.",
      report_url: `${origin}/extensions/${encodeURIComponent(extension)}`,
      recommendation: "needs human review",
    });
  }
  const tier = deriveTrustTier(decision);
  return toolJson({
    extension,
    version: decision.version,
    verdict: decision.decision === "allow" ? "pass" : "fail",
    decision: decision.decision,
    severity: null,
    public_outcome: decision.public_outcome,
    trust_tier: tier.tier,
    trust_summary: tier.summary,
    scanned_at: decision.scanned_at,
    reason: `Latest completed public analysis of version ${decision.version} decided "${decision.decision}".`,
    report_url: `${origin}/extensions/${encodeURIComponent(extension)}`,
    recommendation: recommendation(decision.decision),
  });
}

async function findReputableAlternatives(args: Record<string, unknown>, origin: string) {
  const query = String(args.query || "").trim();
  if (!query) return toolError("Provide a non-empty query, e.g. 'python linter'.");
  const inventory = await getPublicInventory();
  const ranked = rankAlternatives(inventory.items, query, 5);
  if (!ranked.length) {
    return toolJson({
      query,
      alternatives: [],
      note: "No analyzed extension in the public inventory matched this query. Absence from the inventory is not a judgment.",
    });
  }
  return toolJson({
    query,
    alternatives: ranked.map((item) => ({
      extension: item.extension_id,
      display_name: item.display_name,
      version: item.version,
      publisher: item.publisher,
      publisher_verified: item.publisher_verified,
      decision: item.decision,
      severity: item.severity,
      trust_tier: item.trust_tier,
      report_url: `${origin}${item.report_path}`,
    })),
  });
}

function toolJson(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: false,
  };
}

function toolError(text: string) {
  return { content: [{ type: "text", text }], isError: true };
}

function rpcResult(id: JsonRpcId, result: unknown) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: rpcHeaders() },
  );
}

function rpcError(id: JsonRpcId, code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status, headers: rpcHeaders() },
  );
}

function authorize(request: Request): NextResponse | null {
  const accessToken = runtimeEnv(MCP_ACCESS_TOKEN_ENV).trim();
  const requireAuth = runtimeEnv("MCP_REQUIRE_AUTH").trim().toLowerCase() === "true";
  if (!accessToken && !requireAuth) return null;
  if (!accessToken) {
    return NextResponse.json({ error: "MCP authentication is required but not configured." }, { status: 503, headers: { ...rpcHeaders(), "WWW-Authenticate": 'Bearer realm="guardrails-mcp"' } });
  }
  if (validBearerSecret(request.headers.get("authorization"), accessToken)) return null;
  return NextResponse.json({ error: "Unauthorized MCP request." }, { status: 401, headers: { ...rpcHeaders(), "WWW-Authenticate": 'Bearer realm="guardrails-mcp"' } });
}

function contentLength(request: Request): number {
  const value = Number(request.headers.get("content-length") || "0");
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function rpcHeaders(): Record<string, string> {
  return { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "MCP-Protocol-Version": PROTOCOL_VERSION, "X-Content-Type-Options": "nosniff" };
}
