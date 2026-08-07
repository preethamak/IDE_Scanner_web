import { AuthenticationError } from "@/lib/auth";
import { EntitlementError } from "@/lib/entitlements";

export class TeamAuthorizationError extends Error {
  constructor(message = "You do not have permission for this team.") {
    super(message);
    this.name = "TeamAuthorizationError";
  }
}

export function teamApiError(error: unknown, fallback: string) {
  if (error instanceof AuthenticationError) return { status: 401, error: error.message };
  if (error instanceof TeamAuthorizationError) return { status: 403, error: error.message };
  if (error instanceof EntitlementError) return { status: error.status, error: error.message, code: error.code };
  return { status: 503, error: fallback };
}
