import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "collector report uploads are deprecated",
      detail: "Use ide-scanner scan --installed --profile smart --output report.zip, then import report.zip in /scan.",
    },
    { status: 410 }
  );
}
