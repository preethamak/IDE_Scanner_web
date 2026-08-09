"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Activity, ArrowUpRight, BellRing, BookOpen, Bot, Boxes, Building2, ChevronDown, Code2, FileSearch, FlaskConical, Menu, ScanSearch, ScrollText, ShieldCheck, Tags, TerminalSquare, Users, X } from "lucide-react";

type MenuId = "product" | "solutions" | "resources";
type NavItem = readonly [string, string, string, ComponentType];

const menus: Record<MenuId, { label: string; items: readonly NavItem[] }> = {
  product: { label: "Product", items: [
    ["/registry", "Extension Registry", "Inspect exact releases before installation", Boxes],
    ["/monitor", "Release Monitoring", "Review only meaningful permission changes", BellRing],
    ["/workspace", "Team Workspace", "Assign decisions and preserve the evidence", Users],
    ["/ide", "GuardRails IDE", "Preview explicit authority for agents and tools", ShieldCheck],
  ] },
  solutions: { label: "Solutions", items: [
    ["/solutions/developers", "Developers", "Know what runs inside your editor", Code2],
    ["/solutions/engineering-teams", "Engineering teams", "Keep release review attached to ownership", Users],
    ["/solutions/security-teams", "Security teams", "Turn changes into defensible decisions", Building2],
    ["/solutions/ai-agent-security", "AI-agent security", "Contain tools without ambient authority", Bot],
  ] },
  resources: { label: "Resources", items: [
    ["/analyze", "Choose an analysis path", "Registry, CLI, and portable report options", ScanSearch],
    ["/cli", "Local CLI", "Inspect extensions installed on your machine", TerminalSquare],
    ["/research", "How analysis works", "Evidence boundaries and practical guidance", BookOpen],
    ["/metrics", "Detection catalog", "Browse the checks used in reports", FileSearch],
    ["/benchmark", "Validation", "Published tests, coverage, and limitations", FlaskConical],
    ["/settings", "Data boundaries", "Understand what is processed and retained", ScrollText],
  ] },
};

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuId | "mobile" | null>(null);
  const root = useRef<HTMLElement>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const menuLink = ([href, label, detail, Icon]: NavItem, inMenu = false) => <Link role={inMenu ? "menuitem" : undefined} href={href} key={href} onClick={() => setOpen(null)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight/></Link>;
  const entries = Object.entries(menus) as Array<[MenuId, (typeof menus)[MenuId]]>;
  return <nav className="primaryNav guardrailsNav" aria-label="Primary navigation" ref={root}>
    <button className="mobileNavToggle" aria-expanded={open === "mobile"} aria-label={open === "mobile" ? "Close navigation" : "Open navigation"} onClick={() => setOpen(open === "mobile" ? null : "mobile")}>{open === "mobile" ? <X/> : <Menu/>}</button>
    <div className="desktopNav">
      {entries.map(([id, menu]) => <div className="navMenu" key={id}><button className={menu.items.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === id} aria-controls={`${id}-menu`} onClick={() => setOpen(open === id ? null : id)}>{menu.label}<ChevronDown/></button><div id={`${id}-menu`} role="menu" aria-label={menu.label} className={`navPopover groupedNavPopover ${open === id ? "isOpen" : ""}`}><div>{menu.items.map((item) => menuLink(item, true))}</div></div></div>)}
      <Link className={active("/pricing") ? "active" : ""} href="/pricing"><Tags/>Pricing</Link>
      <Link className={active("/status") ? "active" : ""} href="/status"><Activity/>Status</Link>
    </div>
    <div className={`mobileNavPanel ${open === "mobile" ? "isOpen" : ""}`}>
      {entries.map(([id, menu]) => <div className="mobileNavGroup" key={id}><span>{menu.label}</span>{menu.items.map((item) => menuLink(item))}</div>)}
      <div className="mobileNavGroup"><span>Plans and trust</span>{menuLink(["/pricing", "Pricing", "Plans and product availability", Tags])}{menuLink(["/status", "Status", "Live service health and incident history", Activity])}</div>
    </div>
  </nav>;
}
