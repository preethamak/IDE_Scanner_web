import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileCode2,
  Fingerprint,
  GitCompareArrows,
  Network,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import styles from "./landing.module.css";

const popular = [
  ["GitHub Copilot", "GitHub.copilot"],
  ["Cline", "saoudrizwan.claude-dev"],
  ["ESLint", "dbaeumer.vscode-eslint"],
  ["Docker", "ms-azuretools.vscode-docker"],
] as const;

export default function HomeHero() {
  return (
    <section className={styles.signalHero}>
      <div className={styles.heroAtmosphere} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className={styles.signalCopy}>
        <span className={styles.eyebrow}>
          <i /> Extension trust is release-specific
        </span>
        <h1>
          The update is small.
          <br />
          <em>The permission change isn’t.</em>
        </h1>
        <p>
          GuardRails shows what an editor extension can reach, what changed in
          the new package, and the exact evidence behind the decision.
        </p>
        <div className={styles.searchShell}>
          <HomeSearch />
        </div>
        <div className={styles.popular}>
          <span>Try an extension</span>
          {popular.map(([label, query]) => (
            <Link href={`/registry?q=${encodeURIComponent(query)}`} key={query}>
              {label}
            </Link>
          ))}
        </div>
        <div className={styles.heroProof}>
          <span>
            <Check /> Check before install
          </span>
          <span>
            <Check /> Compare every update
          </span>
          <span>
            <Check /> Review as a team
          </span>
        </div>
      </div>

      <div
        className={styles.decisionCanvas}
        aria-label="GuardRails release decision preview"
      >
        <div className={styles.canvasTop}>
          <span>
            <ShieldCheck /> GuardRails release review
          </span>
          <b>Exact package</b>
        </div>
        <div className={styles.releaseIdentity}>
          <span className={styles.releaseGlyph}>CL</span>
          <div>
            <small>saoudrizwan.claude-dev</small>
            <strong>Cline</strong>
            <code>3.18.2 → 3.19.0</code>
          </div>
          <em>Review</em>
        </div>
        <div className={styles.decisionQuestion}>
          <span>What changed?</span>
          <h2>Two new powers appeared in this update.</h2>
          <p>
            The extension can now run terminal commands and reach one additional
            network destination.
          </p>
        </div>
        <div className={styles.signalRows}>
          <article>
            <span>
              <FileCode2 />
            </span>
            <div>
              <small>Files</small>
              <strong>Workspace read + write</strong>
            </div>
            <b>
              <CircleCheck /> Unchanged
            </b>
          </article>
          <article className={styles.signalNew}>
            <span>
              <TerminalSquare />
            </span>
            <div>
              <small>Terminal</small>
              <strong>Runs shell commands</strong>
            </div>
            <b>New</b>
          </article>
          <article className={styles.signalNew}>
            <span>
              <Network />
            </span>
            <div>
              <small>Network</small>
              <strong>3 destinations observed</strong>
            </div>
            <b>+1 host</b>
          </article>
        </div>
        <div className={styles.canvasDecision}>
          <div>
            <Fingerprint />
            <span>
              <strong>Artifact verified</strong>
              <small>94% evidence coverage · exact version</small>
            </span>
          </div>
          <Link href="/registry?q=saoudrizwan.claude-dev">
            Review the evidence <ArrowRight />
          </Link>
        </div>
        <div className={styles.changeOrbit} aria-hidden="true">
          <GitCompareArrows />
          <span>Permission diff</span>
        </div>
      </div>
    </section>
  );
}
