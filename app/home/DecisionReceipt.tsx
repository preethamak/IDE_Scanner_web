import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileKey2,
  GitCommitHorizontal,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import styles from "./landing.module.css";

const trail = [
  { icon: FileKey2, label: "Artifact captured", detail: "sha256: 8b45…19e2", time: "09:41" },
  { icon: GitCommitHorizontal, label: "Release compared", detail: "2 new capabilities", time: "09:42" },
  { icon: UsersRound, label: "Reviewed by Platform", detail: "Approved with reason", time: "10:08" },
] as const;

export default function DecisionReceipt() {
  return (
    <section className={styles.receiptSection} aria-labelledby="receipt-heading">
      <div className={styles.receiptCopy}>
        <span className={styles.eyebrow}><i /> A GuardRails original</span>
        <h2 id="receipt-heading">Turn every approval into a decision receipt.</h2>
        <p>
          A score gets stale. A receipt preserves the exact artifact, what changed,
          who reviewed it, and why the team allowed it—ready to share or revisit
          when the next release lands.
        </p>
        <ul>
          <li><Check /> Bound to the package hash and scanner version</li>
          <li><Check /> Human rationale beside machine evidence</li>
          <li><Check /> A durable baseline for the next update</li>
        </ul>
        <Link href="/registry?q=saoudrizwan.claude-dev">
          Create a receipt from a release <ArrowRight />
        </Link>
      </div>

      <div className={styles.receiptCard} aria-label="Example release decision receipt">
        <header>
          <span><ShieldCheck /> Decision receipt</span>
          <b>GR-CL-3190</b>
        </header>
        <div className={styles.receiptIdentity}>
          <span>CL</span>
          <div>
            <small>saoudrizwan.claude-dev</small>
            <strong>Cline 3.19.0</strong>
          </div>
          <em>Approved</em>
        </div>
        <div className={styles.receiptVerdict}>
          <small>Decision rationale</small>
          <p>New terminal access is expected for the agent workflow. Network change is limited to the documented API host.</p>
        </div>
        <ol className={styles.receiptTrail}>
          {trail.map(({ icon: Icon, label, detail, time }) => (
            <li key={label}>
              <span><Icon /></span>
              <div><strong>{label}</strong><small>{detail}</small></div>
              <time>{time}</time>
            </li>
          ))}
        </ol>
        <footer>
          <span><FileKey2 /> Evidence coverage <strong>94%</strong></span>
          <span>Baseline locked <Check /></span>
        </footer>
      </div>
    </section>
  );
}
