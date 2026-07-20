import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    error: "Browser-only static preflight was retired. Scan the VSIX with the canonical CLI and import its report.zip bundle.",
    code: "canonical_cli_required",
  }, { status: 409 });
}
