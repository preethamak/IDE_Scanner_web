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
    { href: "/", label: "Dashboard", meta: "Posture" },
    { href: "/scan", label: "Scanner", meta: "Run" },
    { href: "/triage", label: "Triage", meta: "Queue" },
    { href: "/metrics", label: "Metrics", meta: "Rules" },
    { href: "/benchmark", label: "Benchmark", meta: "Truth" },
    { href: "/diff", label: "Diff", meta: "Changes" },
    { href: "/history", label: "History", meta: "Reports" },
    { href: "/scoring", label: "Scoring", meta: "Grades" },
    { href: "/settings", label: "Settings", meta: "API" }
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
              <strong>On this machine</strong>
              <p>Inventory and reports stay local unless online checks are enabled.</p>
            </div>
          </aside>
          <div className="mainPane">
            <header className="topBar">
              <div>
                <span>IDE Scanner</span>
                <strong>Local extension security</strong>
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
