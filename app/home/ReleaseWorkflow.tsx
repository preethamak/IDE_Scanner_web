import Link from "next/link";
import { ArrowRight, Check, Eye, GitCompareArrows, Search, UserRoundCheck } from "lucide-react";
import styles from "./landing.module.css";

const steps = [
  { number: "01", title: "Find the extension", body: "Confirm the publisher and version so you inspect the package you actually plan to install.", icon: Search },
  { number: "02", title: "See what it can access", body: "Understand file, command, network, and editor access in plain language.", icon: Eye },
  { number: "03", title: "Compare the update", body: "See new permissions and behavior beside the release your team already reviewed.", icon: GitCompareArrows },
  { number: "04", title: "Make the team decision", body: "Assign an owner, allow or block the release, and keep the reason with the version.", icon: UserRoundCheck },
] as const;

export default function ReleaseWorkflow() {
  return (
    <section className={styles.workflowSection} aria-labelledby="workflow-heading">
      <header><div><span className={styles.eyebrow}><i /> How it works</span><h2 id="workflow-heading">From extension search<br />to a clear team decision.</h2></div><Link href="/research">How analysis works <ArrowRight /></Link></header>
      <div className={styles.workflowGrid}>{steps.map(({ number, title, body, icon: Icon }) => <article key={number}><span>{number}</span><Icon /><div><h3>{title}</h3><p>{body}</p></div><Check /></article>)}</div>
    </section>
  );
}
