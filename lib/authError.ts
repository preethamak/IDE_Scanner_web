const OTP_DELIVERY_FAILURE = "We could not send a sign-in code right now. Please try again shortly or use Google or GitHub sign-in.";

export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return OTP_DELIVERY_FAILURE;
  const candidate = error as { message?: unknown; code?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
  if (!message || message === "{}") return OTP_DELIVERY_FAILURE;
  if (candidate.code === "unexpected_failure" || /sending (magic link|email|otp)/i.test(message)) return OTP_DELIVERY_FAILURE;
  return message;
}
