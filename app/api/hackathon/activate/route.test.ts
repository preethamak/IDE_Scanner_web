import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("hackathon Builder Pass activation", () => {
  it("activates the pass and continues to account setup", async () => {
    const response = await POST(new Request("https://abscissa.dev/api/hackathon/activate", { method: "POST" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/account?next=%2Fworkspace&source=hackathon");
    expect(response.headers.get("set-cookie")).toContain("gr_hackathon_pass=1");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("can activate the pass and go straight to extension discovery", async () => {
    const response = await POST(new Request("https://abscissa.dev/api/hackathon/activate", { method: "POST", body: new URLSearchParams({ to: "scan" }) }));
    expect(response.headers.get("location")).toBe("/registry?source=hackathon");
  });

  it("does not accept an open redirect destination", async () => {
    const response = await POST(new Request("https://abscissa.dev/api/hackathon/activate?to=https://attacker.test", { method: "POST" }));
    expect(response.headers.get("location")).toBe("/account?next=%2Fworkspace&source=hackathon");
  });
});
