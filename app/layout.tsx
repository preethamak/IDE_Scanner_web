import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ShieldCheck } from "lucide-react";
import SiteNav from "./SiteNav";
import HeaderAccount from "./HeaderAccount";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IDE Scanner — Extension intelligence", template: "%s · IDE Scanner" },
  description: "Inspect IDE extension artifacts, behavior, provenance, and release changes before installation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <div className="siteFrame">
      <header className="siteHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/" aria-label="IDE Scanner home"><span><ShieldCheck size={17} strokeWidth={2.2} /></span><strong>IDE Scanner</strong></Link>
          <SiteNav />
          <div className="headerCommands"><HeaderAccount /></div>
        </div>
      </header>
      <div className="pageContent">{children}</div>
      <footer className="siteFooter">
        <div className="footerLead"><Link className="wordmark footerWordmark" href="/"><span><ShieldCheck size={17} /></span><strong>IDE Scanner</strong></Link><p>Security intelligence for every extension inside developer environments.</p></div>
        <div className="footerLinks"><div><strong>Product</strong><Link href="/catalog">Explore extensions</Link><Link href="/scan">Analyze an artifact</Link><Link href="/compare">Compare versions</Link><Link href="/workspace">Monitor releases</Link></div><div><strong>Intelligence</strong><Link href="/research">Security research</Link><Link href="/metrics">Detection catalog</Link><Link href="/benchmark">Validation</Link><Link href="/scoring">Severity guide</Link></div><div><strong>Trust</strong><Link href="/settings">Analysis boundaries</Link><Link href="/security">Security policy</Link><Link href="/design-partners">Design partners</Link></div></div>
        <div className="footerBottom"><span>Ruleset 2026.07.16 · Schema 2.2</span><span>Exact artifacts · Recorded scanner builds · No opaque verdicts</span></div>
      </footer>
    </div>
    <Analytics />
  </body></html>;
}
