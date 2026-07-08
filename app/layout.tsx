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
    { href: "/scan", label: "Scan", meta: "Search" },
    { href: "/metrics", label: "Rules", meta: "Reference" },
    { href: "/scoring", label: "Scoring", meta: "Grades" },
    { href: "/benchmark", label: "Benchmark", meta: "Truth" },
    { href: "/history", label: "Reports", meta: "History" },
    { href: "/diff", label: "Diff", meta: "Changes" },
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
              <span>Live scan</span>
              <strong>Search &rarr; Scan &rarr; Report</strong>
              <p>Search the marketplace, scan an extension, and read the full evidence trail behind its score.</p>
            </div>
          </aside>
          <div className="mainPane">
            <header className="topBar">
              <div>
                <span>IDE Scanner</span>
                <strong>Extension security console</strong>
              </div>
              <Link className="navCta" href="/scan">Scan an extension</Link>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
