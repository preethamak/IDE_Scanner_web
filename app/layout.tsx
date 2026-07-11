import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "./SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IDE Scanner | Extension security decisions",
    template: "%s | IDE Scanner"
  },
  description: "Evidence-backed security decisions for IDE extensions, packages, and client posture."
};

const navItems = [
  { href: "/scan", label: "Scan" },
  { href: "/metrics", label: "Rules" },
  { href: "/scoring", label: "Methodology" },
  { href: "/benchmark", label: "Benchmarks" },
  { href: "/history", label: "Reports" },
  { href: "/diff", label: "Changes" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="appShell productShell">
          <header className="productHeader">
            <div className="productNavFrame">
              <Link className="brand" href="/" aria-label="IDE Scanner home">
                <span aria-hidden="true">IS</span>
                <strong>IDE Scanner</strong>
              </Link>
              <SiteNav items={navItems} />
              <div className="headerActions">
                <Link className="textAction" href="/settings">Deploy</Link>
                <Link className="navCta" href="/scan">Scan extension <span aria-hidden="true">&rarr;</span></Link>
              </div>
            </div>
          </header>
          <div className="mainPane">{children}</div>
          <footer className="productFooter">
            <Link className="brand footerBrand" href="/"><span>IS</span><strong>IDE Scanner</strong></Link>
            <p>Security decisions backed by inspectable evidence, not opaque AI judgment.</p>
            <div><Link href="/metrics">Rule catalog</Link><Link href="/reports">Report format</Link><Link href="/settings">Deployment</Link></div>
          </footer>
        </div>
      </body>
    </html>
  );
}
