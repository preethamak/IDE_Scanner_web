import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";
import { serviceDb } from "@/lib/supabase";
import { getWorkspaceState } from "@/lib/cloudflareWorkspace";
import { getCloudflareScanProduct } from "@/lib/cloudflareDeepScan";
import { getVersionScanProduct } from "@/lib/productData";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string; decisionId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id, decisionId } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    // Only scans bound to a saved decision in this workspace are readable.
    // The request cannot supply a different scan id.
    let scan: Record<string, unknown> | null = null;
    if (provider === "cloudflare") {
      const decision = (await getWorkspaceState(id)).decisions.find((item) => item.id === decisionId);
      if (!decision) return NextResponse.json({ error: "Decision not found." }, { status: 404, headers });
      const extensionId = String(decision.extension_id);
      const version = String(decision.version);
      const scanId = String(decision.scan_id);
      const product = await getCloudflareScanProduct(extensionId, version, scanId)
        || await getVersionScanProduct(extensionId, version, scanId, undefined, { skipCloudflareCatalog: true });
      scan = product?.scan as Record<string, unknown> | null;
    } else {
      const db = serviceDb();
      const decision = await db.from("team_decisions").select("scan_id,extension_id,version").eq("team_id", id).eq("id", decisionId).maybeSingle();
      if (decision.error) throw decision.error;
      if (!decision.data) return NextResponse.json({ error: "Decision not found." }, { status: 404, headers });
      const result = await db.from("scans").select("id,extension_id,version,capabilities,capability_assessment,analysis_status,scanned_at,artifact_sha256").eq("id", decision.data.scan_id).eq("extension_id", decision.data.extension_id).eq("version", decision.data.version).maybeSingle();
      if (result.error) throw result.error;
      scan = result.data;
    }
    if (!scan?.id) return NextResponse.json({ error: "Evidence for this decision could not be loaded." }, { status: 404, headers });
    const summary = Object.fromEntries(["id", "extension_id", "version", "capabilities", "capability_assessment", "analysis_status", "scanned_at", "artifact_sha256"].map((key) => [key, scan![key] ?? null]));
    return NextResponse.json({ scan: summary }, { headers });
  } catch (error) {
    const failure = teamApiError(error, "Decision evidence could not be loaded.");
    return NextResponse.json({ error: failure.error }, { status: failure.status, headers });
  }
}
