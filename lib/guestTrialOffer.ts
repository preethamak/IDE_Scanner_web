export const GUEST_TRIAL_LIMIT = 5;
export const HACKATHON_TRIAL_LIMIT = 10;
export const GUEST_TRIAL_WINDOW_DAYS = 30;
const HACKATHON_PASS_COOKIE = "gr_hackathon_pass";

export function guestTrialLimit(request: Request): number {
  const hasPass = (request.headers.get("cookie") || "")
    .split(";")
    .some((part) => part.trim() === `${HACKATHON_PASS_COOKIE}=1`);
  return hasPass ? HACKATHON_TRIAL_LIMIT : GUEST_TRIAL_LIMIT;
}
