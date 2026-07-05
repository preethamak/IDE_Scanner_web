import Link from "next/link";
import { metricCatalog, ruleFamilies } from "@/lib/metrics";

const evidenceClasses = [
  ["weak", "Single static indicators such as dynamic code loading or network access. Useful context, not a verdict by itself."],
  ["capability", "Declared IDE powers such as terminal tools, debugger hooks, startup activation, or language model tools."],
  ["dependency", "Runtime dependency issues, vulnerable packages, unpinned specs, or mutable install sources."],
  ["provenance", "Marketplace, repository, package integrity, and release posture evidence."],
  ["correlated", "Multiple static signals connected into a stronger chain, such as secret read plus outbound transfer."],
  ["observed", "Runtime sandbox observations that confirm attempted execution, writes, exfiltration, or persistence."],
  ["confirmed", "Known-bad hash, trusted threat feed, or authoritative malware marketplace removal evidence."]
];

export default function MetricsPage() {
  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Reference</p>
          <h1>Scanner metrics</h1>
          <p className="heroCopy">There are {metricCatalog.length} scanner domains, but they expand into {ruleFamilies.length} rule families. One powerful API is not enough for a malware verdict; correlated or confirmed behavior carries more weight.</p>
        </div>
        <Link className="heroAction" href="/">Run a scan</Link>
      </section>

      <section className="pageGrid">
        <div className="referenceStack">
          {metricCatalog.map((metric, index) => (
            <details className="metricDetail" key={metric.id} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{metric.label}</strong>
                <em>{metric.short}</em>
              </summary>
              <div>
                <p>{metric.detail}</p>
                <p>{metric.why}</p>
              </div>
            </details>
          ))}
        </div>

        <aside className="referenceAside">
          <p className="eyebrow">Evidence classes</p>
          <h2>How findings are weighted</h2>
          {evidenceClasses.map(([label, text]) => (
            <div className="evidenceRow" key={label}>
              <strong>{label}</strong>
              <span>{text}</span>
            </div>
          ))}
        </aside>
      </section>

      <section className="ruleMatrix">
        <div className="sectionIntro">
          <p className="eyebrow">Coverage</p>
          <h2>{ruleFamilies.length} rule families</h2>
          <p>These are the named evidence families surfaced in reports. Some are contextual, some affect review risk, and some can drive suspicious or malicious verdicts.</p>
        </div>
        <div className="ruleGrid">
          {ruleFamilies.map((rule) => (
            <span key={rule}>{rule}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
