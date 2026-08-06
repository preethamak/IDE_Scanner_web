"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BellRing, BookOpen, Boxes, ChevronDown, FileSearch, FlaskConical, Menu, ScanSearch, ScrollText, ShieldCheck, TerminalSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const directLinks = [
  ["/registry", "Extension Registry", Boxes],
  ["/monitor", "Release Monitoring", BellRing],
  ["/ide", "Secure IDE", ShieldCheck],
] as const;
const documentationLinks = [
  ["/analyze", "Analyze a file", "Check a VSIX package you already have", ScanSearch],
  ["/cli", "CLI", "Inspect extensions installed on your machine", TerminalSquare],
  ["/research", "How analysis works", "What GuardRails checks and why", BookOpen],
  ["/metrics", "Detection catalog", "Browse the checks used in reports", FileSearch],
  ["/benchmark", "Validation", "See test results and product limits", FlaskConical],
  ["/settings", "Data boundaries", "Understand what is processed and retained", ScrollText],
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
      <div className="navMenu"><button className={documentationLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "documentation"} aria-controls="documentation-menu" onClick={() => setOpen(open === "documentation" ? null : "documentation")}>Resources <ChevronDown/></button><div id="documentation-menu" role="menu" className={`navPopover guardrailPopover documentationPopover ${open === "documentation" ? "isOpen" : ""}`}><div>{documentationLinks.map(menuLink)}</div></div></div>
    </div>
    <div className={`mobileNavPanel ${open === "mobile" ? "isOpen" : ""}`}><span>Product</span>{directLinks.map(([href, label, Icon]) => <Link href={href} key={href} onClick={() => setOpen(null)}><Icon/><strong>{label}</strong></Link>)}<span>Resources</span>{documentationLinks.map(menuLink)}</div>
  </nav>;
}
