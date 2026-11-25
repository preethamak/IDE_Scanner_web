import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/access";
import AdminNav from "./AdminNav";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration · Abscissa", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return <div className="adminShell"><AdminNav /><div className="adminMain"><header className="adminTopbar"><span><i /> Private operations</span><div><span>{user.email || user.id}</span><Link href="/account">Account ↗</Link></div></header>{children}</div></div>;
}
