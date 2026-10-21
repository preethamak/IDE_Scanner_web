import assert from "node:assert/strict";
import { test } from "vitest";
import { verifyProductionDeployment } from "./verify-production-deployment.mjs";

function response(body, init = {}) { return new Response(body, init); }

test("verifies homepage, gate request validation, and an anonymous MCP protocol", async () => {
  const calls = [];
  const checks = await verifyProductionDeployment({
    origin: "https://guardrails.example",
    fetchImpl: async (url) => {
      calls.push(url.pathname);
      if (["/", "/registry", "/status"].includes(url.pathname)) return response("<title>GuardRails</title>", { status: 200, headers: { "Content-Type": "text/html" } });
      if (url.pathname === "/api/gate") return response(JSON.stringify({ error: "missing release" }), { status: 400 });
      return response(JSON.stringify({ result: { protocolVersion: "2025-06-18" } }), { status: 200 });
    },
  });
  assert.deepEqual(calls, ["/", "/registry", "/status", "/api/gate", "/api/mcp"]);
  assert.equal(checks.every((check) => check.ok), true);
});

test("accepts an explicitly protected MCP endpoint while rejecting malformed gate behavior", async () => {
  await assert.rejects(
    verifyProductionDeployment({
      origin: "https://guardrails.example",
      fetchImpl: async (url) => {
        if (["/", "/registry", "/status"].includes(url.pathname)) return response("GuardRails", { status: 200, headers: { "Content-Type": "text/html" } });
        if (url.pathname === "/api/gate") return response("not-json", { status: 200 });
        return response("unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer realm=guardrails-mcp" } });
      },
    }),
    /gate-validation/,
  );
});
