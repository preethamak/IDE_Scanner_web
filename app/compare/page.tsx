"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, LoaderCircle, Search } from "lucide-react";

type Product = {
  extension?: { id?: string; display_name?: string; publisher?: string; installs?: number; publisher_verified?: boolean; registry?: string };
  versions?: Array<{ version?: string; scan_state?: string; published_at?: string }>;
};

export default function ComparePage() {
  const [left, setLeft] = useState("ms-python.python");
  const [right, setRight] = useState("GitHub.copilot");
  const [results, setResults] = useState<[Product, Product] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([left, right].map((id) => fetch(`/api/extensions/${encodeURIComponent(id.trim())}`)));
      if (responses.some((response) => !response.ok)) {
        setError("Both extensions must resolve to supported registries. Check each publisher.extension ID and try again.");
        return;
      }
      setResults(await Promise.all(responses.map((response) => response.json())) as [Product, Product]);
    } catch {
      setError("Guardrails could not load the comparison. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="comparePage">
    <section className="compareHero"><span>Extension comparison</span><h1>Compare access before choosing the tool.</h1><p>Put publisher identity, adoption, release history, and available security evidence beside each other. Popularity is context, not the winner.</p></section>
    <form className="compareForm" onSubmit={compare}>
      <label><span>Extension A</span><div><Search/><input name="extension-a" autoComplete="off" spellCheck={false} value={left} onChange={(event) => setLeft(event.target.value)}/></div></label>
      <GitCompareArrows/>
      <label><span>Extension B</span><div><Search/><input name="extension-b" autoComplete="off" spellCheck={false} value={right} onChange={(event) => setRight(event.target.value)}/></div></label>
      <button className="button buttonDark" disabled={loading}>{loading ? <LoaderCircle className="spin"/> : "Compare extensions"}</button>
    </form>
    {error ? <p className="compareError" role="alert">{error}</p> : null}
    {results ? <section className="comparisonResult">
      <div className="comparisonHead"><span>Product identity</span>{results.map((product) => <div key={product.extension?.id}><h2>{product.extension?.display_name}</h2><code>{product.extension?.id}</code></div>)}</div>
      <CompareRow label="Publisher" values={results.map((item) => item.extension?.publisher || "Unknown")}/>
      <CompareRow label="Verified publisher" values={results.map((item) => item.extension?.publisher_verified ? "Reported verified" : "Not reported")}/>
      <CompareRow label="Registry" values={results.map((item) => item.extension?.registry || "Unknown")}/>
      <CompareRow label="Adoption" values={results.map((item) => formatCount(item.extension?.installs || 0))}/>
      <CompareRow label="Published versions" values={results.map((item) => String(item.versions?.length || 0))}/>
      <CompareRow label="Latest version" values={results.map((item) => String(item.versions?.[0]?.version || "Unknown"))}/>
      <CompareRow label="Latest analysis" values={results.map((item) => String(item.versions?.[0]?.scan_state || "not scanned").replaceAll("_", " "))}/>
      <div className="comparisonActions"><span>Inspect the exact artifacts</span>{results.map((product) => <Link key={product.extension?.id} href={`/extensions/${encodeURIComponent(String(product.extension?.id))}`}>Open {product.extension?.display_name} <ArrowRight/></Link>)}</div>
    </section> : <section className="comparisonEmpty"><GitCompareArrows/><h2>A comparison should end at exact versions.</h2><p>Start with extension identities, then open version intelligence for capabilities, alerts, dependencies, files, and release changes.</p></section>}
  </main>;
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return <div className="compareRow"><strong>{label}</strong>{values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}</div>;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
