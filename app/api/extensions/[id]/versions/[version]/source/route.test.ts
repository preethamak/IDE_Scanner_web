import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ serverDb: async () => ({ from: mocks.from }) }));
import { GET } from "./route";

describe("artifact source preview", () => {
  it("uses the request-bound database client so a signed-in owner can read a private report README", async () => {
    const scan = { maybeSingle: vi.fn().mockResolvedValue({ data: { id: "scan-1", canonical_report: {} } }) };
    const preview = { maybeSingle: vi.fn().mockResolvedValue({ data: { content: "# Cody", content_sha256: "hash", byte_length: 6, truncated: false } }) };
    mocks.from.mockImplementation((table: string) => table === "scans"
      ? { select: () => ({ eq: () => ({ eq: () => ({ eq: () => scan }) }) }) }
      : { select: () => ({ eq: () => ({ eq: () => preview }) }) });

    const response = await GET(new Request("http://localhost/api/extensions/neuralgeeks.cody/versions/0.2.2/source?path=README.md&scan=scan-1"), { params: Promise.resolve({ id: "neuralgeeks.cody", version: "0.2.2" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ path: "README.md", content: "# Cody" });
    expect(mocks.from).toHaveBeenCalledWith("scans");
    expect(mocks.from).toHaveBeenCalledWith("artifact_file_previews");
  });
});
