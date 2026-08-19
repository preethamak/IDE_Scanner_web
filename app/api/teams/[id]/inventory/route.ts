import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { InventoryValidationError, parseTeamInventoryImport } from "@/lib/teamInventory";

type Context = { params: Promise<{ id: string }> };
type Installation = { device_id: string; extension_id: string; version: string; registry: string; reported_at: string };
type Scan = { id: string; extension_id: string; version: string; decision: string; severity: string; scanned_at: string };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const db = serviceDb();
    const [installationResult, deviceResult, watchResult, importResult] = await Promise.all([
      db.from("team_inventory_installations").select("device_id,extension_id,version,registry,reported_at").eq("team_id", id).order("extension_id"),
      db.from("team_inventory_devices").select("id,external_id,display_name,platform,source,last_seen_at").eq("team_id", id).order("last_seen_at", { ascending: false }),
      db.from("team_watchlist_items").select("extension_id,monitoring_state,baseline_version").eq("team_id", id),
      db.from("team_inventory_imports").select("created_at").eq("team_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const firstError = [installationResult.error, deviceResult.error, watchResult.error, importResult.error].find(Boolean);
    if (firstError) throw firstError;
    const installations = (installationResult.data || []) as Installation[];
    const extensionIds = [...new Set(installations.map((item) => item.extension_id))];
    const versions = [...new Set(installations.map((item) => item.version))];
    const [extensionResult, scanResult] = extensionIds.length
      ? await Promise.all([
          db.from("extensions").select("id,display_name,icon_url").in("id", extensionIds),
          db.from("scans").select("id,extension_id,version,decision,severity,scanned_at").in("extension_id", extensionIds).in("version", versions).eq("analysis_status", "complete").order("scanned_at", { ascending: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (extensionResult.error) throw extensionResult.error;
    if (scanResult.error) throw scanResult.error;

    const extensions = new Map((extensionResult.data || []).map((item) => [String(item.id).toLowerCase(), item]));
    const watches = new Map((watchResult.data || []).map((item) => [String(item.extension_id).toLowerCase(), item]));
    const scans = new Map<string, Scan>();
    for (const scan of (scanResult.data || []) as Scan[]) {
      const key = `${scan.extension_id.toLowerCase()}@${scan.version}`;
      if (!scans.has(key)) scans.set(key, scan);
    }
    const items = installations.map((item) => {
      const extension = extensions.get(item.extension_id.toLowerCase());
      const watch = watches.get(item.extension_id.toLowerCase());
      const scan = scans.get(`${item.extension_id.toLowerCase()}@${item.version}`);
      const status = !extension ? "unknown" : !scan ? "unscanned" : ["review", "block"].includes(scan.decision) ? "review_required" : "scanned";
      return { ...item, display_name: extension?.display_name || item.extension_id, icon_url: extension?.icon_url || null, status, monitored: Boolean(watch), monitoring_state: watch?.monitoring_state || null, scan_id: scan?.id || null, decision: scan?.decision || null, severity: scan?.severity || null };
    });
    return NextResponse.json({
      devices: deviceResult.data || [],
      items,
      summary: {
        devices: (deviceResult.data || []).length,
        installations: items.length,
        unique_extensions: new Set(items.map((item) => item.extension_id.toLowerCase())).size,
        scanned: items.filter((item) => item.status === "scanned").length,
        review_required: items.filter((item) => item.status === "review_required").length,
        unscanned: items.filter((item) => item.status === "unscanned").length,
        unknown: items.filter((item) => item.status === "unknown").length,
        monitored: items.filter((item) => item.monitored).length,
      },
      last_import_at: importResult.data?.created_at || null,
    });
  } catch (error) {
    const failure = teamApiError(error, "Team inventory is temporarily unavailable. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const input = parseTeamInventoryImport(await request.json().catch(() => null));
    const { data, error } = await serviceDb().rpc("replace_team_inventory_snapshot", {
      target_team: id,
      actor: user.id,
      device_external_id: input.device.id,
      device_display_name: input.device.name,
      device_platform: input.device.platform,
      import_source: input.source,
      observed_at: input.reported_at,
      extensions: input.extensions,
    });
    if (error) throw error;
    return NextResponse.json({ import: data }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const failure = teamApiError(error, "The inventory could not be imported. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
