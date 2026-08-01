import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, authenticated: mocks.authenticated };
});
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));

import { AuthenticationError } from "@/lib/auth";
import { GET, POST } from "./route";

describe("team workspace endpoint", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset();
    mocks.from.mockReset();
    mocks.authenticated.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns a clear unauthorized response when the session is missing", async () => {
    mocks.authenticated.mockRejectedValue(new AuthenticationError("Authentication required."));

    const response = await GET(new Request("http://localhost/api/teams"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
  });

  it("does not disguise a workspace service failure as a sign-in failure", async () => {
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("database unavailable") }) }) }) });

    const response = await GET(new Request("http://localhost/api/teams"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "The workspace service is temporarily unavailable. Please try again." });
  });

  it("creates a team only after an authenticated request", async () => {
    mocks.authenticated.mockRejectedValue(new AuthenticationError("Authentication session is invalid."));

    const response = await POST(new Request("http://localhost/api/teams", { method: "POST", body: JSON.stringify({ name: "Security" }) }));

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
