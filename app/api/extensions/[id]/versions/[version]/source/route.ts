import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PREVIEW_BYTES = 200 * 1024;
const TEXT_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|ya?ml|md|txt|html?|css|scss|xml|toml|ini|properties)$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const path = new URL(request.url).searchParams.get("path") || "";
  const { id, version } = await context.params;
  if (!path || path.length > 300 || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..") || !TEXT_FILE.test(path)) return NextResponse.json({ error: "This path cannot be previewed safely." }, { status: 400 });
  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Source preview is unavailable." }, { status: 503 });
  const { data: scan } = await db.from("scans").select("id,canonical_report").eq("extension_id", decodeURIComponent(id)).eq("version", decodeURIComponent(version)).is("superseded_at", null).order("scanned_at", { ascending: false }).limit(1).maybeSingle();
  if (!scan) return NextResponse.json({ error: "This report is not available." }, { status: 404 });
  const { data: preview } = await db.from("artifact_file_previews").select("content,content_sha256,byte_length,truncated").eq("scan_id", scan.id).eq("path", path).maybeSingle();
  if (preview) {
    if (Number(preview.byte_length) > MAX_PREVIEW_BYTES) return NextResponse.json({ error: "This source preview exceeds the display limit." }, { status: 422 });
    return NextResponse.json({ path, content: preview.content, content_sha256: preview.content_sha256, truncated: preview.truncated });
  }
  // Reports created before the preview table existed can still retain the
  // hash-recorded snapshot inside their canonical scanner bundle. It is the
  // same artifact evidence, never a freshly downloaded registry file.
  const report = scan.canonical_report && typeof scan.canonical_report === "object" ? scan.canonical_report as Record<string, unknown> : {};
  const extensions = report.extensions;
  const details = Array.isArray(extensions) ? extensions : extensions && typeof extensions === "object" ? Object.values(extensions) : [];
  const detail = details.find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object") || {};
  const inventory = detail.artifact_inventory && typeof detail.artifact_inventory === "object" ? detail.artifact_inventory as Record<string, unknown> : {};
  const snapshots = Array.isArray(inventory.source_previews) ? inventory.source_previews : [];
  const snapshot = snapshots.find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && value.path === path);
  if (!snapshot || typeof snapshot.content !== "string") return NextResponse.json({ error: "No stored source snapshot exists for this exact artifact. Re-scan this version to capture a verified preview." }, { status: 404 });
  if (Buffer.byteLength(snapshot.content) > MAX_PREVIEW_BYTES) return NextResponse.json({ error: "This source preview exceeds the display limit." }, { status: 422 });
  return NextResponse.json({ path, content: snapshot.content, content_sha256: String(snapshot.content_sha256 || "recorded in report"), truncated: Boolean(snapshot.truncated), source: "canonical-report" });
}
