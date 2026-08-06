import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// Icons are only ever served from this fixed directory. The caller supplies a
// relative name; anything resolving outside the root is rejected so this
// endpoint cannot be used to read arbitrary files on the server.
const iconRoot = path.join(process.cwd(), "public", "extensions");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") || "";
  const extension = extensionName(rawPath);
  if (!contentTypes[extension]) {
    return NextResponse.json(
      { error: "unsupported icon type" },
      { status: 400 },
    );
  }

  const relative = rawPath.split("?")[0] || "";
  if (!relative || relative.includes("\0")) {
    return NextResponse.json({ error: "invalid icon path" }, { status: 400 });
  }
  const resolved = path.resolve(iconRoot, relative);
  if (resolved !== iconRoot && !resolved.startsWith(iconRoot + path.sep)) {
    return NextResponse.json({ error: "invalid icon path" }, { status: 400 });
  }

  try {
    const data = await readFile(resolved);
    return new Response(data, {
      headers: {
        "Content-Type": contentTypes[extension],
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "icon not found" }, { status: 404 });
  }
}

function extensionName(filePath: string): string {
  const match = /(\.[a-z0-9]+)$/i.exec(filePath.split("?")[0] || "");
  return match ? match[1].toLowerCase() : "";
}
