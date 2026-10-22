import { NextResponse } from "next/server";
import { getVersionProduct } from "@/lib/productData";
import { publicReleaseSarif } from "@/lib/sarifReleaseExport";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await context.params;
  const product = await getVersionProduct(id, version);
  const scan = product?.scan as Record<string, unknown> | null | undefined;
  if (!product || !scan || String(scan.analysis_status || "complete") !== "complete") {
    return NextResponse.json({ error: "No completed public report exists for this exact version." }, { status: 404 });
  }
  const reportUrl = new URL(`/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(String(scan.id || ""))}`, request.url).toString();
  const payload = publicReleaseSarif({ extensionId: id, version, scan, findings: Array.isArray(product.findings) ? product.findings : [], reportUrl });
  const filename = `guardrails-${safePart(id)}-${safePart(version)}.sarif`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/sarif+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

function safePart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
}
