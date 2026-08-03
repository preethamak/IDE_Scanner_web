export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmailOtp(value: string): string {
  // Supabase email OTPs are configurable from six to ten digits. The client
  // must preserve the complete code rather than assuming the default length.
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isEmailOtp(value: string): boolean {
  return /^\d{6,10}$/.test(value);
}
