import { NextResponse } from "next/server";
import { authenticatedByApiKey } from "@/lib/apiKeyAuth";
import { AuthenticationError } from "@/lib/auth";
import { EntitlementError } from "@/lib/entitlements";
import { isValidGateCheck, lookupGateVerdict, type GateCheck } from "@/lib/gateLookup";
import { publicDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Team-plan bulk gate: check an entire extension inventory in one call.
//   curl -fsS -X POST "https://abscissa.dev/api/gate/bulk" \
//     -H "Authorization: Bearer $GUARDRAILS_API_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"checks":[{"extension":"publisher.name","version":"1.2.3"}],"fail_on":"unreviewed"}'
// Always returns HTTP 200 with a per-item verdict array plus a summary, since
// a partial-fail response is meaningful for a bulk caller (unlike the single
// /api/gate endpoint, which relies on the HTTP status for `curl -fsS`).

const MAX_CHECKS_PER_REQUEST = 200;

export async function POST(request: Request) {
  let auth;
  try {
    auth = await authenticatedByApiKey(request);
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof EntitlementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Bulk gate is temporarily unavailable." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const failOnUnreviewed = body.fail_on === "unreviewed";
  const rawChecks = Array.isArray(body.checks) ? body.checks : [];
  if (!rawChecks.length) {
    return NextResponse.json({ error: "Provide a non-empty checks array of {extension, version}." }, { status: 400 });
  }
  if (rawChecks.length > MAX_CHECKS_PER_REQUEST) {
    return NextResponse.json({ error: `A single bulk request supports at most ${MAX_CHECKS_PER_REQUEST} checks.` }, { status: 400 });
  }
  const checks: GateCheck[] = rawChecks.map((entry) => ({
    extension: String((entry as Record<string, unknown>)?.extension || "").trim(),
    version: String((entry as Record<string, unknown>)?.version || "").trim(),
  }));
  const invalid = checks.filter((check) => !isValidGateCheck(check));
  if (invalid.length) {
    return NextResponse.json(
      { error: "Every check needs a valid extension (publisher.name) and version.", invalid },
      { status: 400 },
    );
  }

  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Analysis backend is unavailable." }, { status: 503 });

  const results = await Promise.all(checks.map((check) => lookupGateVerdict(db, check, failOnUnreviewed)));
  const summary = results.reduce(
    (acc, result) => ({ ...acc, [result.verdict]: acc[result.verdict] + 1 }),
    { pass: 0, fail: 0, unreviewed: 0 },
  );
  return NextResponse.json(
    { results, summary, team_id: auth.teamId },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
