import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authenticated, AuthenticationError } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtimeEnv";

export class AdminAccessError extends Error {
  constructor(readonly status: 401 | 403) { super(status === 401 ? "Sign in to continue." : "Administrator access is required."); }
}
export function isAdminUser(id: string): boolean {
  const allowed = runtimeEnv("ABSCISSA_ADMIN_USER_IDS").split(",").map(value => value.trim()).filter(Boolean);
  return allowed.includes(id);
}
export async function requireAdmin(request: Request) {
  let auth;
  try { auth = await authenticated(request); }
  catch (error) { if (error instanceof AuthenticationError) throw new AdminAccessError(401); throw error; }
  if (!isAdminUser(auth.user.id)) throw new AdminAccessError(403);
  return auth.user;
}
export async function requireAdminPage() {
  try { return await requireAdmin(new Request("https://abscissa.dev/admin", { headers: new Headers(await headers()) })); }
  catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) redirect("/account?next=%2Fadmin");
    if (error instanceof AdminAccessError) notFound();
    throw error;
  }
}
