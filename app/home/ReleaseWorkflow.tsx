import Link from "next/link";
import { ArrowRight, Check, Eye, GitCompareArrows, Search, UserRoundCheck } from "lucide-react";
import styles from "./landing.module.css";

const steps = [
  { number: "01", title: "Find the exact release", body: "Resolve the publisher, extension identity, and version before interpreting behavior.", icon: Search },
  { number: "02", title: "Inspect the evidence", body: "Move from summarized capabilities into the files and signals that support them.", icon: Eye },
  { number: "03", title: "Compare what changed", body: "Keep the reviewed release beside the new artifact so added authority is obvious.", icon: GitCompareArrows },
  { number: "04", title: "Record the decision", body: "Give the release an owner, a clear outcome, and a durable explanation.", icon: UserRoundCheck },
] as const;

export default function ReleaseWorkflow() {
  return (
    <section className={styles.workflowSection} aria-labelledby="workflow-heading">
      <header><div><span className={styles.eyebrow}><i /> How it works</span><h2 id="workflow-heading">From marketplace listing<br />to defensible decision.</h2></div><Link href="/research">How analysis works <ArrowRight /></Link></header>
      <div className={styles.workflowGrid}>{steps.map(({ number, title, body, icon: Icon }) => <article key={number}><span>{number}</span><Icon /><div><h3>{title}</h3><p>{body}</p></div><Check /></article>)}</div>
    </section>
  );
}
