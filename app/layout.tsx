import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ArrowUpRight } from "lucide-react";
import SiteNav from "./SiteNav";
import HeaderAccount from "./HeaderAccount";
import BrandMark from "./BrandMark";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import "./guardrails.css";
import "./visual-refresh.css";
import "./design-system.css";
import "./landing.css";
import "./accessibility.css";
import "./product-ui.css";

export const metadata: Metadata = {
  title: { default: "GuardRails — Extension security intelligence", template: "%s · GuardRails" },
  description: "Inspect, approve, and continuously monitor the exact extensions entering developer environments."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <div className="siteFrame">
      <a className="skipLink" href="#main-content">Skip to content</a>
      <header className="siteHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/" aria-label="Guardrails home"><BrandMark/><strong>Guardrails</strong></Link>
          <SiteNav />
          <div className="headerCommands"><HeaderAccount /></div>
        </div>
      </header>
      <div id="main-content" className="pageContent">{children}</div>
      <footer className="siteFooter">
        <div className="footerMain"><div className="footerLead"><Link className="wordmark footerWordmark" href="/"><BrandMark/><strong>Guardrails</strong></Link><h2>Extension security,<br/>kept in the loop.</h2><p>Understand an extension before you install it, then keep an eye on new releases.</p><Link className="footerCta" href="/registry">Search extensions <ArrowUpRight/></Link></div>
        <div className="footerLinks"><div><strong>Product</strong><Link href="/registry">Extension Registry</Link><Link href="/analyze">Analyze a file</Link><Link href="/cli">Guardrails CLI</Link><Link href="/monitor">Monitor</Link></div><div><strong>Trust & docs</strong><Link href="/research">How analysis works</Link><Link href="/metrics">Detection catalog</Link><Link href="/benchmark">Validation</Link><Link href="/scoring">Verdicts & severity</Link></div><div><strong>Company</strong><Link href="/about">About Guardrails</Link><Link href="/privacy">Data handling</Link><Link href="/settings">Analysis boundaries</Link><Link href="/security">Security</Link></div></div></div>
        <div className="footerBottom"><span>© GuardRails</span><span>Exact artifacts · Evidence first</span></div>
      </footer>
    </div>
    <Analytics />
  </body></html>;
}
