import { afterEach, describe, expect, it } from "vitest";
import { feedbackEmailConfigured, feedbackEmailPayload } from "@/lib/feedbackEmail";

const original = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.NOTIFICATION_FROM_EMAIL,
  to: process.env.FEEDBACK_TO_EMAIL,
};

afterEach(() => {
  process.env.RESEND_API_KEY = original.apiKey;
  process.env.NOTIFICATION_FROM_EMAIL = original.from;
  process.env.FEEDBACK_TO_EMAIL = original.to;
});

describe("feedback email delivery", () => {
  it("uses the existing Resend sender and the company inbox by default", () => {
    process.env.RESEND_API_KEY = "resend_test";
    process.env.NOTIFICATION_FROM_EMAIL = "feedback@abscissa.dev";
    delete process.env.FEEDBACK_TO_EMAIL;

    expect(feedbackEmailConfigured()).toBe(true);
    expect(
      feedbackEmailPayload({
        id: "feedback-1",
        category: "report_clarity",
        message: "The evidence summary was useful.",
        contactEmail: "person@example.com",
        pagePath: "/extensions/example",
        createdAt: "2026-08-30T12:00:00.000Z",
      }),
    ).toMatchObject({
      to: ["hello@abscissa.dev"],
      subject: "[GuardRails feedback] Report clarity",
      text: expect.stringContaining("The evidence summary was useful."),
    });
  });

  it("allows the destination inbox to be changed without changing code", () => {
    process.env.RESEND_API_KEY = "resend_test";
    process.env.NOTIFICATION_FROM_EMAIL = "feedback@abscissa.dev";
    process.env.FEEDBACK_TO_EMAIL = "product@example.com";

    expect(feedbackEmailPayload({
      id: "feedback-2",
      category: "bug",
      message: "A button did not respond.",
      contactEmail: null,
      pagePath: "/registry",
      createdAt: "2026-08-30T12:00:00.000Z",
    }).to).toEqual(["product@example.com"]);
  });
});
