"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, ShieldCheck } from "lucide-react";
import { operationSections, canAdmin, sectionPermission, type AdminRole } from "@/lib/admin/permissions";
import { adminSections } from "@/lib/admin/catalog";
export default function AdminNav({role="owner"}:{role?:AdminRole}) {
  const sections = [...adminSections.filter(section=>canAdmin(role,sectionPermission(section.key))), ...operationSections.filter(section=>canAdmin(role,section.permission)).map(section=>({...section,key:"operations/"+section.key,group:["studio","facts"].includes(section.key)?"Publishing":"Operations"}))];
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <aside className="adminSidebar"><Link className="adminBrand" href="/admin"><ShieldCheck size={26} /><span>Abscissa<small>ADMINISTRATION</small></span></Link><button className="adminMobileToggle" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)}>Dashboard navigation <span>{open ? "Close −" : "Open +"}</span></button><nav id="admin-navigation" className={open ? "adminNavOpen" : ""} aria-label="Admin navigation">{Array.from(new Set(sections.map(section => section.group))).map(group => <div className="adminNavGroup" key={group}><p>{group}</p>{sections.filter(section => section.group === group).map(section => <Link prefetch={false} href={`/admin/${section.key}`} key={section.key} onClick={() => setOpen(false)} aria-current={path === `/admin/${section.key}` || path === "/admin" && section.key === "users" ? "page" : undefined}>{section.title}</Link>)}</div>)}</nav><Link className="adminReturn" href="https://abscissa.dev/"><Activity size={16} /> Back to product <ArrowUpRight size={14} /></Link></aside>;
}
