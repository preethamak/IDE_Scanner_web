"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BellRing, BookOpen, Boxes, ChevronDown, FileSearch, FlaskConical, LayoutDashboard, Menu, Radar, ScanSearch, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const productLinks = [
  ["/catalog", "Discover", "Search public extension intelligence", Boxes],
  ["/public-scan", "Public Scan", "Browse exact public scan records", Radar],
  ["/scan", "Analyze", "Inspect an exact release or private VSIX", ScanSearch],
  ["/workspace", "Dashboard", "Triage release and evidence changes", LayoutDashboard],
  ["/monitor", "Monitor", "Watch releases and deliver alerts", BellRing],
] as const;
const intelligenceLinks = [
  ["/research", "Research", "Field notes on extension security", BookOpen],
  ["/metrics", "Detection catalog", "Inspect rules and evidence classes", FileSearch],
  ["/benchmark", "Validation", "Frozen artifacts and regression evidence", FlaskConical],
] as const;

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<"product" | "intelligence" | "mobile" | null>(null);
  const root = useRef<HTMLElement>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  const link = ([href, label, detail, Icon]: (typeof productLinks)[number] | (typeof intelligenceLinks)[number]) => <Link role="menuitem" href={href} key={href} onClick={() => setOpen(null)}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight/></Link>;
  return <nav className="primaryNav guardrailsNav" aria-label="Primary navigation" ref={root}>
    <button className="mobileNavToggle" aria-label={open === "mobile" ? "Close navigation" : "Open navigation"} onClick={() => setOpen(open === "mobile" ? null : "mobile")}>{open === "mobile" ? <X/> : <Menu/>}</button>
    <div className="desktopNav">
      <div className="navMenu"><button className={productLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "product"} onClick={() => setOpen(open === "product" ? null : "product")}>Product <ChevronDown/></button><div role="menu" className={`navPopover guardrailPopover productPopover ${open === "product" ? "isOpen" : ""}`}><div>{productLinks.map(link)}</div><aside><Radar/><span>CONTINUOUS INTELLIGENCE</span><strong>Inspect once.<br/>Know when it changes.</strong><p>Watch an approved extension and GUARDRAILS follows every exact release.</p><Link href="/monitor" onClick={() => setOpen(null)}>Open Monitor <ArrowUpRight/></Link></aside></div></div>
      <Link className={active("/catalog") ? "active" : ""} href="/catalog">Discover</Link>
      <Link className={active("/monitor") ? "active" : ""} href="/monitor">Monitor</Link>
      <div className="navMenu"><button className={intelligenceLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "intelligence"} onClick={() => setOpen(open === "intelligence" ? null : "intelligence")}>Intelligence <ChevronDown/></button><div role="menu" className={`navPopover guardrailPopover intelligencePopover ${open === "intelligence" ? "isOpen" : ""}`}><div>{intelligenceLinks.map(link)}</div></div></div>
    </div>
    <div className={`mobileNavPanel ${open === "mobile" ? "isOpen" : ""}`}><span>Product</span>{productLinks.map(link)}<span>Intelligence</span>{intelligenceLinks.map(link)}</div>
  </nav>;
}
