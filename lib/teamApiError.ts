import { AuthenticationError } from "@/lib/auth";

export class TeamAuthorizationError extends Error {
  constructor(message = "You do not have permission for this team.") {
    super(message);
    this.name = "TeamAuthorizationError";
  }
}

export function teamApiError(error: unknown, fallback: string) {
  if (error instanceof AuthenticationError) return { status: 401, error: error.message };
  if (error instanceof TeamAuthorizationError) return { status: 403, error: error.message };
  return { status: 503, error: fallback };
}
