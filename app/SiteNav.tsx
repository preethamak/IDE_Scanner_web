"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BellRing, BookOpen, Boxes, ChevronDown, FileSearch, FlaskConical, Menu, Radar, ScanSearch, ScrollText, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const directLinks = [
  ["/catalog", "Discover", Boxes],
  ["/public-scan", "Extension Registry", Radar],
  ["/scan", "Analyze", ScanSearch],
  ["/monitor", "Monitor", BellRing],
] as const;
const documentationLinks = [
  ["/research", "Documentation", "How GUARDRAILS evaluates extensions", BookOpen],
  ["/metrics", "Detection catalog", "Inspect rules and evidence classes", FileSearch],
  ["/benchmark", "Validation", "Frozen artifacts and regression evidence", FlaskConical],
  ["/scoring", "Verdicts & severity", "How severity and decisions are explained", ShieldCheck],
  ["/settings", "Analysis boundaries", "What the scanner can and cannot assess", ScrollText],
] as const;

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<"documentation" | "mobile" | null>(null);
  const root = useRef<HTMLElement>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  const menuLink = ([href, label, detail, Icon]: (typeof documentationLinks)[number]) => <Link role="menuitem" href={href} key={href} onClick={() => setOpen(null)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight/></Link>;
  return <nav className="primaryNav guardrailsNav" aria-label="Primary navigation" ref={root}>
    <button className="mobileNavToggle" aria-label={open === "mobile" ? "Close navigation" : "Open navigation"} onClick={() => setOpen(open === "mobile" ? null : "mobile")}>{open === "mobile" ? <X/> : <Menu/>}</button>
    <div className="desktopNav">
      {directLinks.map(([href, label]) => <Link className={active(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}
      <div className="navMenu"><button className={documentationLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "documentation"} onClick={() => setOpen(open === "documentation" ? null : "documentation")}>Documentation <ChevronDown/></button><div role="menu" className={`navPopover guardrailPopover documentationPopover ${open === "documentation" ? "isOpen" : ""}`}><div>{documentationLinks.map(menuLink)}</div></div></div>
    </div>
    <div className={`mobileNavPanel ${open === "mobile" ? "isOpen" : ""}`}><span>Explore</span>{directLinks.map(([href, label, Icon]) => <Link href={href} key={href} onClick={() => setOpen(null)}><Icon/><strong>{label}</strong></Link>)}<span>Documentation</span>{documentationLinks.map(menuLink)}</div>
  </nav>;
}
