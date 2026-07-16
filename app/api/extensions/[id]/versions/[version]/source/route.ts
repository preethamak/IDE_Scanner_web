import { createHash } from "node:crypto";
import yauzl from "yauzl";
import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 200 * 1024;
const TEXT_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|ya?ml|md|txt|html?|css|scss|xml|toml|ini|properties)$/i;

export async function GET(request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const path = new URL(request.url).searchParams.get("path") || "";
  const { id, version } = await context.params;
  if (!path || path.length > 300 || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..") || !TEXT_FILE.test(path)) return NextResponse.json({ error: "This path cannot be previewed safely." }, { status: 400 });
  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Source preview is unavailable." }, { status: 503 });
  const [{ data: artifact }, { data: scan }] = await Promise.all([
    db.from("extension_versions").select("download_url,latest_scan_id").eq("extension_id", decodeURIComponent(id)).eq("version", decodeURIComponent(version)).maybeSingle(),
    db.from("scans").select("artifact_inventory").eq("extension_id", decodeURIComponent(id)).eq("version", decodeURIComponent(version)).is("superseded_at", null).order("scanned_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const downloadUrl = String(artifact?.download_url || "");
  const inventory = (scan?.artifact_inventory || {}) as Record<string, unknown>;
  const expectedHash = String(inventory.vsix_hash || "").toLowerCase();
  if (!downloadUrl || !/^[a-f0-9]{64}$/.test(expectedHash)) return NextResponse.json({ error: "This report has no recorded VSIX hash for safe source preview." }, { status: 409 });
  const response = await fetch(downloadUrl, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const length = Number(response.headers.get("content-length") || 0);
  if (!response.ok || (length && length > MAX_ARCHIVE_BYTES)) return NextResponse.json({ error: "The published artifact is unavailable or exceeds the preview limit." }, { status: 502 });
  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.length > MAX_ARCHIVE_BYTES || createHash("sha256").update(archive).digest("hex") !== expectedHash) return NextResponse.json({ error: "The currently published VSIX does not match the hash recorded by this report." }, { status: 409 });
  try {
    const content = await readEntry(archive, path);
    return NextResponse.json({ path, content, verified_vsix_hash: expectedHash, truncated: Buffer.byteLength(content) >= MAX_PREVIEW_BYTES });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Preview extraction failed." }, { status: 422 }); }
}

function readEntry(archive: Buffer, requestedPath: string): Promise<string> {
  return new Promise((resolve, reject) => yauzl.fromBuffer(archive, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
    if (error || !zip) return reject(error || new Error("Could not read the VSIX."));
    let found = false;
    zip.readEntry();
    zip.on("entry", (entry) => {
      const name = entry.fileName.replace(/^extension\//, "");
      if (name !== requestedPath) return zip.readEntry();
      found = true;
      if (entry.uncompressedSize > MAX_PREVIEW_BYTES) { zip.close(); return reject(new Error("This text file exceeds the 200 KB preview limit.")); }
      zip.openReadStream(entry, (streamError, stream) => {
        if (streamError || !stream) { zip.close(); return reject(streamError || new Error("Could not open this file.")); }
        const chunks: Buffer[] = []; let size = 0;
        stream.on("data", (chunk: Buffer) => { size += chunk.length; if (size <= MAX_PREVIEW_BYTES) chunks.push(chunk); else stream.destroy(); });
        stream.on("error", reject); stream.on("end", () => { zip.close(); const value = Buffer.concat(chunks); if (value.includes(0)) return reject(new Error("Binary files cannot be previewed.")); resolve(value.toString("utf8")); });
      });
    });
    zip.on("end", () => { if (!found) reject(new Error("This file was not found in the hash-verified VSIX.")); });
    zip.on("error", reject);
  }));
}
