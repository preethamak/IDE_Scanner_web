import type { Metadata } from "next";
import Link from "next/link";
import { Code2, ShieldCheck } from "lucide-react";
import SiteNav from "./SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IDE Scanner — Extension intelligence", template: "%s · IDE Scanner" },
  description: "Inspect IDE extension artifacts, behavior, provenance, and release changes before installation."
};

const navigation = [
  { href: "/catalog", label: "Catalog" },
  { href: "/scan", label: "Scanner" },
  { href: "/metrics", label: "Intelligence" },
  { href: "/benchmark", label: "Benchmarks" },
  { href: "/reports", label: "Reports" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <div className="siteFrame">
      <header className="siteHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/" aria-label="IDE Scanner home"><span><ShieldCheck size={17} strokeWidth={2.2} /></span><strong>IDE Scanner</strong></Link>
          <SiteNav items={navigation} />
          <div className="headerCommands">
            <a className="iconButton" href="https://github.com/preethamak/IDE_Scanner" aria-label="IDE Scanner source code" title="Source code"><Code2 size={18} /></a>
            <Link className="button buttonDark buttonSmall" href="/scan">Analyze extension</Link>
          </div>
        </div>
      </header>
      <div className="pageContent">{children}</div>
      <footer className="siteFooter">
        <div className="footerLead"><Link className="wordmark footerWordmark" href="/"><span><ShieldCheck size={17} /></span><strong>IDE Scanner</strong></Link><p>Evidence-first security intelligence for the extensions inside developer environments.</p></div>
        <div className="footerLinks"><div><strong>Product</strong><Link href="/catalog">Catalog</Link><Link href="/scan">Scanner</Link><Link href="/reports">Reports</Link></div><div><strong>Intelligence</strong><Link href="/metrics">Metrics</Link><Link href="/scoring">Methodology</Link><Link href="/benchmark">Benchmarks</Link></div><div><strong>Trust</strong><Link href="/settings">Architecture</Link><a href="https://github.com/preethamak/IDE_Scanner">Source code</a></div></div>
        <div className="footerBottom"><span>Ruleset 2026.07.11</span><span>Open methodology. Inspectable evidence.</span></div>
      </footer>
    </div>
  </body></html>;
}
