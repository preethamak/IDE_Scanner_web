import Link from "next/link";

export default function LegacyExtensionPage() {
  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Extension detail</p>
          <h1>Open details from an imported report</h1>
          <p className="heroCopy">
            Extension detail pages are now report-scoped so the UI can lazy-load the scanner-emitted detail file without recalculating scores or grades.
          </p>
        </div>
        <Link className="heroAction" href="/scan">Import report</Link>
      </section>
    </main>
  );
}
