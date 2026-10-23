import { beforeEach, describe, expect, it, vi } from "vitest";

const { revokeMcpToken } = vi.hoisted(() => ({ revokeMcpToken: vi.fn() }));
vi.mock("@/lib/mcpOAuth", () => ({ revokeMcpToken }));

import { OPTIONS, POST } from "./route";

describe("OAuth revocation endpoint", () => {
  beforeEach(() => revokeMcpToken.mockReset().mockResolvedValue(undefined));

  it("revokes a token for its registered public client", async () => {
    const response = await POST(
      new Request("https://abscissa.dev/oauth/revoke", {
        method: "POST",
        body: new URLSearchParams({ token: "mcp_refresh_secret", client_id: "mcp_client_1" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(revokeMcpToken).toHaveBeenCalledWith({ token: "mcp_refresh_secret", clientId: "mcp_client_1" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps malformed and unknown token responses indistinguishable", async () => {
    const response = await POST(new Request("https://abscissa.dev/oauth/revoke", { method: "POST", body: "not-form-data" }));
    expect(response.status).toBe(200);
    expect(revokeMcpToken).not.toHaveBeenCalled();
  });

  it("advertises browser-safe preflight behavior", () => {
    expect(OPTIONS().headers.get("access-control-allow-methods")).toContain("POST");
  });
});
