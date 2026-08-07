import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function get(pathParam: string) {
  const url = `http://localhost/api/extension-icons?path=${encodeURIComponent(pathParam)}`;
  return GET(new Request(url));
}

describe("extension-icons route", () => {
  afterEach(() => vi.restoreAllMocks());
  it("rejects absolute path traversal outside the icon root", async () => {
    const response = await get("/etc/passwd.png");
    expect(response.status).toBe(400);
  });

  it("rejects relative path traversal", async () => {
    const response = await get("../../../../etc/hosts.png");
    expect(response.status).toBe(400);
  });

  it("rejects unsupported types", async () => {
    const response = await get("vyper-guard.exe");
    expect(response.status).toBe(400);
  });

  it("serves a known icon from the fixed root", async () => {
    const response = await get("vyper-guard.png");
    // Either 200 (file exists) or 404 (not found), never a traversal read.
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.headers.get("cache-control")).toContain("public");
      expect(response.headers.get("cache-control")).toContain("immutable");
    }
  });

  it("proxies and caches an allowlisted Marketplace icon", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "Content-Type": "image/png", "Content-Length": "4" },
      }),
    );
    const remote =
      "https://publisher.gallerycdn.vsassets.io/extensions/publisher/name/1.0/icon.png";
    const response = await GET(
      new Request(
        `http://localhost/api/extension-icons?url=${encodeURIComponent(remote)}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=604800");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(upstream).toHaveBeenCalledWith(
      new URL(remote),
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("rejects arbitrary hosts before making a network request", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const response = await GET(
      new Request(
        "http://localhost/api/extension-icons?url=https%3A%2F%2Fexample.com%2Ficon.png",
      ),
    );
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("negative-caches missing remote icons", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    const response = await GET(
      new Request(
        "http://localhost/api/extension-icons?url=https%3A%2F%2Fopen-vsx.org%2Fmissing.png",
      ),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
  });
});
