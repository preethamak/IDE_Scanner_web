import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  serviceDb: () => ({
    rpc: mocks.rpc,
    from: () => ({ update: mocks.update }),
  }),
}));

import { POST } from "./route";

const original = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.NOTIFICATION_FROM_EMAIL,
};

describe("feedback route", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.update.mockReset();
    mocks.eq.mockReset();
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATION_FROM_EMAIL;
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = original.apiKey;
    process.env.NOTIFICATION_FROM_EMAIL = original.from;
    vi.unstubAllGlobals();
  });

  it("validates before touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "not-supported", message: "hello" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("stores feedback and records a skipped email when Resend is not configured", async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: "feedback-1", created_at: "2026-08-30T12:00:00.000Z" },
      error: null,
    });

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({
          category: "suggestion",
          message: "Add a compact report summary.",
          page_path: "/registry",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, email_delivered: false });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_feedback",
      expect.objectContaining({
        p_category: "suggestion",
        p_page_path: "/registry",
        p_requester_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ email_status: "skipped", email_error: null }),
    );
  });

  it("sends the company notification and marks it delivered", async () => {
    process.env.RESEND_API_KEY = "resend_test";
    process.env.NOTIFICATION_FROM_EMAIL = "feedback@abscissa.dev";
    mocks.rpc.mockResolvedValue({
      data: { id: "feedback-2", created_at: "2026-08-30T12:00:00.000Z" },
      error: null,
    });
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "The registry filter is hard to discover.",
          contact_email: "person@example.com",
          page_path: "/registry",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, email_delivered: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: expect.stringContaining("The registry filter is hard to discover."),
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ email_status: "sent", email_error: null }),
    );
  });
});
