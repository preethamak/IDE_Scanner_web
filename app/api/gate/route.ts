import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// CI gate: exit non-zero when the exact release fails policy.
//   curl -fsS "https://abscissa.dev/api/gate?extension=publisher.name&version=1.2.3"
// verdict "pass" | "fail" | "unreviewed" — a failing gate returns HTTP 422 so
// `curl -fsS` breaks the pipeline; "unreviewed" fails only with --fail-on
// unreviewed.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const extension = (url.searchParams.get("extension") || "").trim();
  const version = (url.searchParams.get("version") || "").trim();
  const failOnUnreviewed = url.searchParams.get("fail-on") === "unreviewed";
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extension) || !/^[\w.+-]{1,64}$/.test(version)) {
    return NextResponse.json(
      { error: "Provide extension (publisher.name) and version query parameters." },
      { status: 400 },
    );
  }
  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Analysis backend is unavailable." }, { status: 503 });
  const { data: rows, error } = await db
    .from("scans")
    .select("id,extension_id,version,decision,severity,public_outcome,coverage_percent,scanned_at")
    .eq("extension_id", extension)
    .eq("version", version)
    .in("scan_purpose", ["public_intelligence", "benchmark"])
    .eq("analysis_status", "complete")
    .is("superseded_at", null)
    .order("scanned_at", { ascending: false })
    .limit(1);
  if (error) return NextResponse.json({ error: "Gate lookup failed." }, { status: 502 });
  const scan = (rows || [])[0] as Record<string, unknown> | undefined;
  if (!scan) {
    return NextResponse.json(
      {
        verdict: failOnUnreviewed ? "fail" : "unreviewed",
        decision: null,
        reason: "No completed public analysis exists for this exact release. This is not an approval.",
        report: null,
        checked: { extension, version },
      },
      { headers: gateHeaders() },
    );
  }
  const decision = String(scan.decision || "incomplete");
  const verdict = decision === "allow" ? "pass" : "fail";
  return NextResponse.json(
    {
      verdict,
      decision,
      severity: scan.severity ?? null,
      public_outcome: scan.public_outcome ?? null,
      coverage_percent: Number(scan.coverage_percent || 0),
      reason: decision === "allow"
        ? "Latest completed public analysis allows this exact release."
        : "Latest completed public analysis requires review or blocks this exact release.",
      report: `/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(String(scan.id))}`,
      scan_id: scan.id,
      checked: { extension_id: scan.extension_id, version: scan.version, scanned_at: scan.scanned_at },
    },
    { status: verdict === "fail" ? 422 : 200, headers: gateHeaders() },
  );
}

function gateHeaders() {
  return { "Cache-Control": "public, max-age=60, s-maxage=300" };
}
