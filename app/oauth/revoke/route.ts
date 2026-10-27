import { NextResponse } from "next/server";
import { revokeMcpToken } from "@/lib/mcpOAuth";

export const dynamic = "force-dynamic";

/** Public clients use their registered client_id; the response is intentionally
 * identical for unknown, expired, and already-revoked tokens. */
export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  if (body) {
    await revokeMcpToken({
      token: String(body.get("token") || ""),
      clientId: String(body.get("client_id") || ""),
    }).catch(() => undefined);
  }
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
