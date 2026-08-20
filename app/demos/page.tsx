import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product demos · GuardRails",
  description: "Short, silent product walkthroughs from GuardRails.",
};

const demos = [
  {
    title: "Review a release",
    description: "Search an extension and inspect the evidence behind a release decision.",
    src: "/demos/guardrails-release-review-demo.mp4",
  },
  {
    title: "Audit local extensions",
    description: "See the GuardRails CLI inventory and local-analysis workflow.",
    src: "/demos/guardrails-cli-demo.mp4",
  },
  {
    title: "Spot a permission change",
    description: "Compare a new version against the approved baseline.",
    src: "/demos/guardrails-permission-diff-demo.mp4",
  },
] as const;

export default function DemosPage() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "8rem 1.5rem 5rem" }}>
      <header style={{ maxWidth: 720, marginBottom: "3rem" }}>
        <p style={{ color: "#80e7bd", fontWeight: 700, letterSpacing: ".1em", fontSize: ".75rem" }}>PRODUCT DEMOS</p>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1, margin: "1rem 0" }}>See GuardRails work.</h1>
        <p style={{ fontSize: "1.15rem", lineHeight: 1.6, color: "#a9b6c7" }}>Short, silent walkthroughs recorded from the real product.</p>
      </header>
      <section style={{ display: "grid", gap: "2rem" }}>
        {demos.map((demo) => (
          <article key={demo.src} style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 20, overflow: "hidden", background: "rgba(10,18,29,.72)" }}>
            <video autoPlay muted loop playsInline controls preload="metadata" style={{ display: "block", width: "100%", background: "#07111d" }}>
              <source src={demo.src} type="video/mp4" />
              Your browser does not support video playback.
            </video>
            <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
              <h2 style={{ fontSize: "1.35rem", margin: 0 }}>{demo.title}</h2>
              <p style={{ margin: ".45rem 0 0", color: "#a9b6c7" }}>{demo.description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
