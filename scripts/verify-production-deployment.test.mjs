import assert from "node:assert/strict";
import { test } from "vitest";
import { verifyProductionDeployment } from "./verify-production-deployment.mjs";

function response(body, init = {}) { return new Response(body, init); }

const securityHeaders = {
  "Content-Type": "text/html",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; object-src 'none'",
};

const publicStatus = {
  overall: "operational",
  services: ["registry", "deep-scan", "analysis", "notifications", "api"].map((id) => ({ id })),
  incidents: [],
};

test("verifies homepage, gate request validation, and an anonymous MCP protocol", async () => {
  const calls = [];
  const checks = await verifyProductionDeployment({
    origin: "https://guardrails.example",
    fetchImpl: async (url) => {
      calls.push(url.pathname);
      if (["/", "/registry", "/status"].includes(url.pathname)) return response("<title>GuardRails</title>", { status: 200, headers: securityHeaders });
      if (url.pathname === "/api/status") return response(JSON.stringify(publicStatus), { status: 200, headers: { "Content-Type": "application/json" } });
      if (url.pathname === "/api/gate") return response(JSON.stringify({ error: "missing release" }), { status: 400 });
      return response(JSON.stringify({ result: { protocolVersion: "2025-06-18" } }), { status: 200 });
    },
  });
  assert.deepEqual(calls, ["/", "/registry", "/status", "/api/status", "/api/gate", "/api/mcp"]);
  assert.equal(checks.every((check) => check.ok), true);
});

test("accepts an explicitly protected MCP endpoint while rejecting malformed gate behavior", async () => {
  await assert.rejects(
    verifyProductionDeployment({
      origin: "https://guardrails.example",
      fetchImpl: async (url) => {
        if (["/", "/registry", "/status"].includes(url.pathname)) return response("GuardRails", { status: 200, headers: securityHeaders });
        if (url.pathname === "/api/status") return response(JSON.stringify({ ...publicStatus, overall: "outage" }), { status: 503, headers: { "Content-Type": "application/json" } });
        if (url.pathname === "/api/gate") return response("not-json", { status: 200 });
        return response("unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer realm=guardrails-mcp" } });
      },
    }),
    /gate-validation/,
  );
});

test("rejects missing browser protections", async () => {
  await assert.rejects(
    verifyProductionDeployment({
      origin: "https://guardrails.example",
      fetchImpl: async (url) => {
        if (["/", "/registry", "/status"].includes(url.pathname)) return response("GuardRails", { status: 200, headers: { "Content-Type": "text/html" } });
        if (url.pathname === "/api/status") return response(JSON.stringify(publicStatus), { status: 200 });
        if (url.pathname === "/api/gate") return response(JSON.stringify({ error: "missing release" }), { status: 400 });
        return response(JSON.stringify({ result: { protocolVersion: "2025-06-18" } }), { status: 200 });
      },
    }),
    /security-headers/,
  );
});

test("rejects an incomplete public status payload", async () => {
  await assert.rejects(
    verifyProductionDeployment({
      origin: "https://guardrails.example",
      fetchImpl: async (url) => {
        if (["/", "/registry", "/status"].includes(url.pathname)) return response("GuardRails", { status: 200, headers: securityHeaders });
        if (url.pathname === "/api/status") return response(JSON.stringify({ overall: "operational", services: [], incidents: [] }), { status: 200 });
        if (url.pathname === "/api/gate") return response(JSON.stringify({ error: "missing release" }), { status: 400 });
        return response(JSON.stringify({ result: { protocolVersion: "2025-06-18" } }), { status: 200 });
      },
    }),
    /public-status-contract/,
  );
});
