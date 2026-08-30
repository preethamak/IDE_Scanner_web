import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";
import { isValidGateCheck, lookupGateVerdict } from "@/lib/gateLookup";

export const dynamic = "force-dynamic";

// CI gate: exit non-zero when the exact release fails policy.
//   curl -fsS "https://abscissa.dev/api/gate?extension=publisher.name&version=1.2.3"
// verdict "pass" | "fail" | "unreviewed" — a failing gate returns HTTP 422 so
// `curl -fsS` breaks the pipeline; "unreviewed" fails only with --fail-on
// unreviewed. See /api/gate/bulk for checking many releases in one call.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const extension = (url.searchParams.get("extension") || "").trim();
  const version = (url.searchParams.get("version") || "").trim();
  const failOnUnreviewed = url.searchParams.get("fail-on") === "unreviewed";
  const check = { extension, version };
  if (!isValidGateCheck(check)) {
    return NextResponse.json(
      { error: "Provide extension (publisher.name) and version query parameters." },
      { status: 400 },
    );
  }
  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Analysis backend is unavailable." }, { status: 503 });
  let result;
  try {
    result = await lookupGateVerdict(db, check, failOnUnreviewed);
  } catch {
    return NextResponse.json({ error: "Gate lookup failed." }, { status: 502 });
  }
  return NextResponse.json(result, { status: result.verdict === "fail" ? 422 : 200, headers: gateHeaders() });
}

function gateHeaders() {
  return { "Cache-Control": "public, max-age=60, s-maxage=300" };
}
