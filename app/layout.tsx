import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ArrowUpRight } from "lucide-react";
import { Instrument_Sans, JetBrains_Mono, Marck_Script } from "next/font/google";
import SiteNav from "./SiteNav";
import HeaderAccount from "./HeaderAccount";
import BrandMark from "./BrandMark";
import "./globals.css";
import "./guardrails.css";
import "./visual-refresh.css";
import "./design-system.css";

const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const brand = Marck_Script({ weight: "400", subsets: ["latin"], variable: "--font-brand" });

export const metadata: Metadata = {
  title: { default: "GuardRails — Extension security intelligence", template: "%s · GuardRails" },
  description: "Inspect, approve, and continuously monitor the exact extensions entering developer environments."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${instrument.variable} ${mono.variable} ${brand.variable}`}><body>
    <div className="siteFrame">
      <header className="siteHeader">
        <div className="headerInner">
          <Link className="wordmark" href="/" aria-label="Guardrails home"><BrandMark/><strong>Guardrails</strong></Link>
          <SiteNav />
          <div className="headerCommands"><HeaderAccount /></div>
        </div>
      </header>
      <div className="pageContent">{children}</div>
      <footer className="siteFooter">
        <div className="footerMain"><div className="footerLead"><Link className="wordmark footerWordmark" href="/"><BrandMark/><strong>Guardrails</strong></Link><h2>Extension security,<br/>kept in the loop.</h2><p>Exact-artifact intelligence for the developer tools your organization installs and trusts.</p><Link className="footerCta" href="/scan">Analyze an extension <ArrowUpRight/></Link></div>
        <div className="footerLinks"><div><strong>Product</strong><Link href="/catalog">Discover</Link><Link href="/scan">Analyze</Link><Link href="/workspace">Dashboard</Link><Link href="/monitor">Monitor</Link></div><div><strong>Intelligence</strong><Link href="/research">Research</Link><Link href="/metrics">Detection catalog</Link><Link href="/benchmark">Validation</Link><Link href="/scoring">Severity guide</Link></div><div><strong>Trust</strong><Link href="/about">About the product</Link><Link href="/privacy">Data handling</Link><Link href="/settings">Analysis boundaries</Link><Link href="/security">Security</Link></div></div></div>
        <div className="footerBottom"><span>© GuardRails</span><span>Exact artifacts · Evidence first</span></div>
      </footer>
    </div>
    <Analytics />
  </body></html>;
}
