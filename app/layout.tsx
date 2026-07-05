import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "./SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDE Scanner",
  description: "Local-first IDE extension security scanner"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems = [
    { href: "/", label: "Home", meta: "Start" },
    { href: "/scan", label: "Scanner", meta: "Run" },
    { href: "/metrics", label: "Metrics", meta: "Rules" },
    { href: "/benchmark", label: "Benchmark", meta: "Truth" },
    { href: "/diff", label: "Diff", meta: "Changes" },
    { href: "/history", label: "History", meta: "Reports" },
    { href: "/scoring", label: "Scoring", meta: "Grades" },
    { href: "/settings", label: "Wiring", meta: "Deploy" }
  ];

  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <aside className="sideRail">
            <Link className="brand" href="/">
              <span>IS</span>
              <strong>IDE Scanner</strong>
            </Link>
            <SiteNav items={navItems} />
            <div className="railStatus">
              <span>Local runtime</span>
              <strong>Scanner host only</strong>
              <p>The web server can scan the machine it runs on. Hosted SaaS needs a local agent.</p>
            </div>
          </aside>
          <div className="mainPane">
            <header className="topBar">
              <div>
                <span>IDE Scanner</span>
                <strong>Extension security console</strong>
              </div>
              <Link className="navCta" href="/scan">New scan</Link>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
