import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage, adminRole } from "@/lib/admin/access";
import AdminNav from "./AdminNav";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration · Abscissa", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const role = await adminRole(user.id);
  return <div className="adminShell"><AdminNav role={role||"viewer"} /><div className="adminMain"><header className="adminTopbar"><span><i /> Private operations</span><div><span>{user.email || user.id}</span><Link href="https://abscissa.dev/account">Account ↗</Link></div></header>{children}</div></div>;
}
