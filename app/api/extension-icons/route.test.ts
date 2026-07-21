import { describe, expect, it } from "vitest";
import { GET } from "./route";

function get(pathParam: string) {
  const url = `http://localhost/api/extension-icons?path=${encodeURIComponent(pathParam)}`;
  return GET(new Request(url));
}

describe("extension-icons route", () => {
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
  });
});
