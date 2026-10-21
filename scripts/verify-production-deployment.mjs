const DEFAULT_ORIGIN = "https://abscissa.dev";
const TIMEOUT_MS = 15_000;

export async function verifyProductionDeployment({ origin = process.env.GUARDRAILS_PRODUCTION_URL || process.env.GUARDRAILS_DEPLOYMENT_URL || DEFAULT_ORIGIN, mcpBearerToken = process.env.GUARDRAILS_VERIFY_MCP_BEARER_TOKEN || "", fetchImpl = fetch } = {}) {
  const base = new URL(origin);
  const checks = [];
  await checkApplicationShells(base, fetchImpl, checks);
  await checkPublicStatus(base, fetchImpl, checks);
  await checkOpenApiContract(base, fetchImpl, checks);
  await checkGateValidation(base, fetchImpl, checks);
  await checkMcpBoundary(base, fetchImpl, mcpBearerToken, checks);
  const failed = checks.filter((check) => check.ok === false);
  if (failed.length) throw new Error(`Production contract verification failed: ${failed.map((check) => `${check.name}: ${check.detail}`).join("; ")}`);
  return checks;
}

async function checkOpenApiContract(base, fetchImpl, checks) {
  const response = await request(fetchImpl, new URL("/openapi.json", base), { headers: { Accept: "application/json" } });
  const body = await json(response);
  const paths = body?.paths && typeof body.paths === "object" ? body.paths : {};
  const gate = paths["/api/gate"];
  const bulkGate = paths["/api/gate/bulk"];
  const valid = response.status === 200 && typeof body?.openapi === "string" && gate?.get && bulkGate?.post;
  checks.push({ name: "openapi-public-contract", ok: valid, detail: valid ? "OpenAPI publishes the single and bulk exact-release gates." : `Expected OpenAPI gate paths with HTTP 200, received HTTP ${response.status}` });
}

async function checkApplicationShells(base, fetchImpl, checks) {
  for (const path of ["/", "/registry", "/status"]) {
    const response = await request(fetchImpl, new URL(path, base), { headers: { Accept: "text/html" } });
    const text = await response.text();
    const html = String(response.headers.get("content-type") || "").includes("text/html");
    checks.push({ name: `application-shell:${path}`, ok: response.ok && html && /guardrails/i.test(text), detail: response.ok && html ? "GuardRails application shell responded." : `HTTP ${response.status} ${response.headers.get("content-type") || "without content type"}` });
    const requiredHeaders = [
      ["strict-transport-security", /max-age=63072000/i],
      ["x-content-type-options", /^nosniff$/i],
      ["x-frame-options", /^DENY$/i],
      ["referrer-policy", /^strict-origin-when-cross-origin$/i],
      ["content-security-policy", /default-src 'self'/i],
    ];
    const missing = requiredHeaders
      .filter(([name, pattern]) => !pattern.test(String(response.headers.get(name) || "")))
      .map(([name]) => name);
    checks.push({ name: `security-headers:${path}`, ok: missing.length === 0, detail: missing.length === 0 ? "Required browser security headers are present." : `Missing or invalid headers: ${missing.join(", ")}` });
  }
}

async function checkPublicStatus(base, fetchImpl, checks) {
  const response = await request(fetchImpl, new URL("/api/status", base), { headers: { Accept: "application/json" } });
  const body = await json(response);
  const validState = ["operational", "degraded", "outage", "unknown"].includes(body?.overall);
  const services = Array.isArray(body?.services) ? body.services : [];
  const stableServices = ["registry", "deep-scan", "analysis", "notifications", "api"];
  const missingServices = stableServices.filter((id) => !services.some((service) => service?.id === id));
  const contractValid = validState && Array.isArray(body?.incidents) && missingServices.length === 0;
  const expectedStatus = response.status === 200 || response.status === 503;
  checks.push({ name: "public-status-contract", ok: expectedStatus && contractValid, detail: expectedStatus && contractValid ? `Public status contract is valid (${body.overall}).` : `Expected a valid status payload with HTTP 200 or 503; received HTTP ${response.status}` });
}

async function checkGateValidation(base, fetchImpl, checks) {
  const response = await request(fetchImpl, new URL("/api/gate", base));
  const body = await json(response);
  checks.push({ name: "gate-validation", ok: response.status === 400 && typeof body?.error === "string", detail: response.status === 400 ? "Gate rejects an incomplete exact-release request." : `Expected HTTP 400, received ${response.status}` });
}

async function checkMcpBoundary(base, fetchImpl, mcpBearerToken, checks) {
  const headers = { "Content-Type": "application/json" };
  if (mcpBearerToken) headers.Authorization = `Bearer ${mcpBearerToken}`;
  const response = await request(fetchImpl, new URL("/api/mcp", base), { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: "deployment-verification", method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "guardrails-deployment-verifier", version: "1" } } }) });
  const body = await json(response);
  const initialized = response.status === 200 && body?.result?.protocolVersion === "2025-06-18";
  const mcpProtected = response.status === 401 && String(response.headers.get("www-authenticate") || "").includes("Bearer");
  checks.push({ name: "mcp-protocol-or-auth-boundary", ok: initialized || mcpProtected, detail: initialized ? "MCP initialize response is valid." : mcpProtected ? "MCP bearer boundary is active." : `Unexpected MCP response HTTP ${response.status}` });
  if (!initialized) return;

  const toolsResponse = await request(fetchImpl, new URL("/api/mcp", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: "deployment-verification-tools", method: "tools/list" }),
  });
  const toolsBody = await json(toolsResponse);
  const tools = Array.isArray(toolsBody?.result?.tools) ? toolsBody.result.tools : [];
  const requiredTools = ["check_extension_risk", "get_extension_release", "search_vscode_extensions", "get_guardrails_analysis_rules"];
  const missing = requiredTools.filter((name) => !tools.some((tool) => tool?.name === name && tool?.annotations?.readOnlyHint === true));
  checks.push({ name: "mcp-public-tool-contract", ok: toolsResponse.status === 200 && missing.length === 0, detail: missing.length === 0 ? "Required public MCP tools remain read-only and available." : `Missing or non-read-only MCP tools: ${missing.join(", ")}` });
}

async function request(fetchImpl, url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetchImpl(url, { ...init, redirect: "error", signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function json(response) {
  try { return await response.json(); } catch { return null; }
}

export async function main() {
  const checks = await verifyProductionDeployment();
  for (const check of checks) console.log(`verified ${check.name}: ${check.detail}`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
