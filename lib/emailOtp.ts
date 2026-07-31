export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmailOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isEmailOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}
