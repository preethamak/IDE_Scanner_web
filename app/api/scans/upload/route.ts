import { NextResponse } from "next/server";
import path from "node:path";
import { scanUploadedHosted } from "@/lib/hostedScanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".vsix", ".zip"]);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a .vsix or .zip package." }, { status: 400 });
  if (!ALLOWED_EXTENSIONS.has(path.extname(file.name).toLowerCase())) return NextResponse.json({ error: "Only .vsix or .zip packages are accepted." }, { status: 400 });
  if (!file.size || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Package is empty or exceeds the 50MB limit." }, { status: 400 });
  try {
    const result = scanUploadedHosted(new Uint8Array(await file.arrayBuffer()), file.name);
    return NextResponse.json({ id: result.scanId, status: "complete", createdAt: Date.now(), updatedAt: Date.now(), error: null, summary: result.summary, report: result.report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hosted package scan failed" }, { status: 422 });
  }
}
