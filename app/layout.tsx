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
import "@fontsource/marck-script/400.css";
import "./globals.css";
import "./guardrails.css";
import "./visual-refresh.css";
import "./design-system.css";
import "./landing.css";
import "./accessibility.css";
import "./product-ui.css";
import "./readability.css";

export const metadata: Metadata = {
  title: {
    default: "GuardRails — Extension security intelligence",
    template: "%s · GuardRails",
  },
  description:
    "See what editor extensions can access and know when that behavior changes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="siteFrame">
          <a className="skipLink" href="#main-content">
            Skip to content
          </a>
          <header className="siteHeader">
            <div className="headerInner">
              <Link className="wordmark" href="/" aria-label="Guardrails home">
                <BrandMark />
                <strong>Guardrails</strong>
              </Link>
              <SiteNav />
              <div className="headerCommands">
                <Link className="headerProductCta" href="/registry">
                  Check an extension
                </Link>
                <HeaderAccount />
              </div>
            </div>
          </header>
          <div id="main-content" className="pageContent">
            {children}
          </div>
          <footer className="siteFooter">
            <div className="footerMain">
              <div className="footerLead">
                <Link className="wordmark footerWordmark" href="/">
                  <BrandMark />
                  <strong>Guardrails</strong>
                </Link>
                <h2>
                  Know what runs
                  <br />
                  in your editor.
                </h2>
                <p>
                  See what extensions can access before installation and
                  whenever a new release changes their behavior.
                </p>
                <Link className="footerCta" href="/registry">
                  Check an extension <ArrowUpRight />
                </Link>
              </div>
              <div className="footerLinks">
                <div>
                  <strong>Product</strong>
                  <Link href="/registry">Extension Registry</Link>
                  <Link href="/monitor">Release Monitoring</Link>
                  <Link href="/workspace">Team Workspace</Link>
                  <Link href="/ide">GuardRails IDE</Link>
                  <Link href="/pricing">Pricing</Link>
                  <Link href="/status">Product Status</Link>
                </div>
                <div>
                  <strong>Resources</strong>
                  <Link href="/analyze">Choose an analysis path</Link>
                  <Link href="/cli">Local CLI</Link>
                  <Link href="/research">How analysis works</Link>
                  <Link href="/benchmark">Validation and limits</Link>
                  <Link href="/solutions/developers">For developers</Link>
                  <Link href="/solutions/engineering-teams">For teams</Link>
                </div>
                <div>
                  <strong>Company</strong>
                  <Link href="/about">About Guardrails</Link>
                  <Link href="/privacy">Data handling</Link>
                  <Link href="/settings">Analysis boundaries</Link>
                  <Link href="/security">Security</Link>
                </div>
              </div>
            </div>
            <div className="footerBottom">
              <span>© GuardRails</span>
              <span>
                Extension behavior, before install and after every update.
              </span>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
