import { describe, expect, it } from "vitest";
import {
  FEEDBACK_CATEGORY_LABELS,
  isFeedbackCategory,
  isFeedbackEmail,
} from "@/lib/feedback";

describe("feedback input contract", () => {
  it("accepts only the supported categories and bounded contact emails", () => {
    expect(isFeedbackCategory("bug")).toBe(true);
    expect(isFeedbackCategory("security_issue")).toBe(false);
    expect(isFeedbackEmail("person@example.com")).toBe(true);
    expect(isFeedbackEmail("not-an-email")).toBe(false);
    expect(isFeedbackEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });

  it("keeps category labels user-facing and stable", () => {
    expect(FEEDBACK_CATEGORY_LABELS.report_clarity).toBe("Report clarity");
  });
});
