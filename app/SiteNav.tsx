"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Boxes, ChevronDown, FileSearch, GitCompareArrows, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const productLinks = [
  ["/catalog", "Extension catalog", "Search every supported registry", Boxes],
  ["/scan", "Artifact scanner", "Analyze a published or private VSIX", ScanSearch],
  ["/compare", "Version comparison", "See new access and behavior", GitCompareArrows],
  ["/workspace", "Personal monitoring", "Watch releases and scan history", Radar],
] as const;
const resourceLinks = [["/metrics", "Rules and metrics"], ["/scoring", "Decision methodology"], ["/benchmark", "Validation and benchmarks"], ["/settings", "Trust architecture"]] as const;

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<"product" | "resources" | null>(null);
  const root = useRef<HTMLElement>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); }; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); }; document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape); return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); }; }, []);
  return <nav className="primaryNav productNav" aria-label="Primary navigation" ref={root}>
    <div className="navMenu"><button className={productLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "product"} aria-controls="product-menu" aria-haspopup="menu" onClick={() => setOpen(open === "product" ? null : "product")}>Product <ChevronDown/></button><div id="product-menu" role="menu" className={`navPopover ${open === "product" ? "isOpen" : ""}`}><div><span>IDE extension security</span>{productLinks.map(([href, label, detail, Icon]) => <Link role="menuitem" href={href} key={href} onClick={() => setOpen(null)}><Icon/><div><strong>{label}</strong><small>{detail}</small></div></Link>)}</div><aside><ShieldCheck/><strong>Start with the extension, not a deployment.</strong><p>Public intelligence is available without an account.</p><Link href="/catalog" onClick={() => setOpen(null)}>Explore extensions</Link></aside></div></div>
    <Link className={active("/catalog") ? "active" : ""} href="/catalog">Explore</Link>
    <Link className={active("/workspace") ? "active" : ""} href="/workspace">Monitor</Link>
    <div className="navMenu resourcesMenu"><button className={resourceLinks.some(([href]) => active(href)) ? "active" : ""} aria-expanded={open === "resources"} aria-controls="research-menu" aria-haspopup="menu" onClick={() => setOpen(open === "resources" ? null : "resources")}>Research <ChevronDown/></button><div id="research-menu" role="menu" className={`navPopover resourcePopover ${open === "resources" ? "isOpen" : ""}`}><div><span>Learn and verify</span>{resourceLinks.map(([href, label]) => <Link role="menuitem" href={href} key={href} onClick={() => setOpen(null)}>{href === "/metrics" ? <FileSearch/> : href === "/benchmark" ? <Activity/> : <BookOpen/>}<strong>{label}</strong></Link>)}</div></div></div>
  </nav>;
}
