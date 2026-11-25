import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authenticated, AuthenticationError } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtimeEnv";
import { privateDb } from "@/lib/cloudflarePrivate";
import { canAdmin, adminRoles, type AdminRole, type AdminPermission } from "./permissions";

export class AdminAccessError extends Error {
  constructor(readonly status: 401 | 403) { super(status === 401 ? "Sign in to continue." : "Administrator access is required."); }
}
export function isAdminUser(id: string): boolean {
  const allowed = runtimeEnv("ABSCISSA_ADMIN_USER_IDS").split(",").map(value => value.trim()).filter(Boolean);
  return allowed.includes(id);
}
export async function adminRole(id: string): Promise<AdminRole | null> {
  if (isAdminUser(id)) return 'owner';
  try {
    const row = await privateDb().prepare('SELECT role FROM app_admin_members WHERE user_id=? AND active=1').bind(id).first<{role:string}>();
    return row && adminRoles.includes(row.role as typeof adminRoles[number]) ? row.role as AdminRole : null;
  } catch { return null; }
}
export async function requireAdmin(request: Request, permission: AdminPermission = 'analytics:read') {
  let auth;
  try { auth = await authenticated(request); }
  catch (error) { if (error instanceof AuthenticationError) throw new AdminAccessError(401); throw error; }
  const role = await adminRole(auth.user.id);
  if (!role || !canAdmin(role, permission)) throw new AdminAccessError(403);
  return auth.user;
}
export async function requireAdminPage(permission: AdminPermission = "analytics:read") {
  try { return await requireAdmin(new Request("https://abscissa.dev/admin", { headers: new Headers(await headers()) }), permission); }
  catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) {
      const host = (await headers()).get('host')?.split(':')[0];
      redirect(host === 'admin.abscissa.dev' ? '/api/admin/sso/login' : '/account?next=%2Fadmin');
    }
    if (error instanceof AdminAccessError) notFound();
    throw error;
  }
}
