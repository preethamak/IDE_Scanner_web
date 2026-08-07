import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTrustedExtensionIconUrl } from "@/lib/extensionIconUrl";

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
const MAX_ICON_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const remoteUrl = url.searchParams.get("url");
  if (remoteUrl) return proxyRemoteIcon(remoteUrl);
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
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "icon not found" },
      { status: 404, headers: { "Cache-Control": "public, max-age=3600" } },
    );
  }
}

async function proxyRemoteIcon(value: string) {
  let current: URL;
  try {
    current = new URL(value);
  } catch {
    return iconError("invalid remote icon URL", 400);
  }
  for (let redirects = 0; redirects <= 2; redirects += 1) {
    if (!isTrustedExtensionIconUrl(current))
      return iconError("remote icon host is not allowed", 400);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*",
        },
      });
    } catch {
      clearTimeout(timeout);
      return iconError("remote icon unavailable", 502, 300);
    }
    clearTimeout(timeout);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === 2)
        return iconError("invalid remote icon redirect", 502, 300);
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) return iconError("remote icon unavailable", 404, 3600);
    const contentType = String(response.headers.get("content-type") || "")
      .split(";")[0]
      .toLowerCase();
    if (!contentType.startsWith("image/") || contentType === "image/x-icon") {
      return iconError("remote response is not a supported image", 415, 3600);
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_ICON_BYTES)
      return iconError("remote icon is too large", 413, 3600);
    const data = await response.arrayBuffer();
    if (data.byteLength > MAX_ICON_BYTES)
      return iconError("remote icon is too large", 413, 3600);
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
  return iconError("remote icon unavailable", 502, 300);
}

function iconError(message: string, status: number, maxAge = 3600) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": `public, max-age=${maxAge}` } },
  );
}

function extensionName(filePath: string): string {
  const match = /(\.[a-z0-9]+)$/i.exec(filePath.split("?")[0] || "");
  return match ? match[1].toLowerCase() : "";
}
