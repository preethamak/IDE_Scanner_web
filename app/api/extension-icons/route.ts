import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") || "";
  const extension = extensionName(rawPath);
  if (!contentTypes[extension]) {
    return NextResponse.json({ error: "unsupported icon type" }, { status: 400 });
  }

  try {
    const data = await readFile(/* turbopackIgnore: true */ rawPath);
    return new Response(data, {
      headers: {
        "Content-Type": contentTypes[extension],
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: "icon not found" }, { status: 404 });
  }
}

function extensionName(filePath: string): string {
  const match = /(\.[a-z0-9]+)$/i.exec(filePath.split("?")[0] || "");
  return match ? match[1].toLowerCase() : "";
}
