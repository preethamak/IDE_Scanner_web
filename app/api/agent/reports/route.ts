import { NextResponse } from "next/server";
import { agentReportToJob, saveAgentReport } from "@/lib/agentReports";
import { validBearerSecret } from "@/lib/internalRunnerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const expectedToken = process.env.IDE_SCANNER_AGENT_TOKEN;
  // Fail closed: an unconfigured token must never mean "no auth required".
  // A route that silently accepts anonymous writes when the secret is missing
  // is an open ingestion endpoint the moment it is deployed without the env var.
  if (!expectedToken) {
    return NextResponse.json({ error: "agent report ingestion is not configured" }, { status: 503 });
  }
  if (!validBearerSecret(request.headers.get("authorization"), expectedToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const raw = await request.text().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "invalid agent report" }, { status: 400 });
  }
  // Guard against a chunked/streamed body that omits or lies about
  // Content-Length: cap the actual bytes read before parsing.
  if (Buffer.byteLength(raw) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid agent report" }, { status: 400 });
  }

  try {
    const report = await saveAgentReport(payload);
    return NextResponse.json(agentReportToJob(report), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid agent report" },
      { status: 400 }
    );
  }
}
