import { NextResponse } from "next/server";
import { websiteBenchmark } from "@/lib/websiteBenchmark";
import { getReproducibleBenchmark, immutableScanPath } from "@/lib/benchmarkEvidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const evidence = await getReproducibleBenchmark();
  return NextResponse.json({ ...websiteBenchmark, publication: { published: evidence.published, awaiting: evidence.awaiting, requirement: "A row is published only with an immutable exact-artifact Deep Scan." }, rows: evidence.rows.map((row) => ({ extension_id: row.id, version: row.version, sha256: row.sha256, classification: row.classification, split: row.split, scan: row.scan, report_path: immutableScanPath(row) })) }, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
