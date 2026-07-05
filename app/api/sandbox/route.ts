import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/pythonBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SandboxPayload = {
  path?: unknown;
  allow_execute?: unknown;
  timeout?: unknown;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as SandboxPayload;
  if (typeof payload.path !== "string" || !payload.path) {
    return NextResponse.json({ error: "path must be a string" }, { status: 400 });
  }
  try {
    const result = await runPythonBridge("sandbox", {
      path: payload.path,
      allow_execute: Boolean(payload.allow_execute),
      timeout: typeof payload.timeout === "number" ? payload.timeout : 15
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sandbox failed" },
      { status: 500 }
    );
  }
}
