import { groupDecisionQueue } from "@/lib/teamDecisionQueue";
import type { QueueDecision } from "@/lib/teamDecisionQueue";
import { humanize, initials } from "@/app/workspace/format";
import PageTitle from "@/app/workspace/views/PageTitle";
import styles from "@/app/workspace/teamWorkspace.module.css";

export default function DecisionsView({
  decisions,
}: {
  decisions: QueueDecision[];
}) {
  const groups = groupDecisionQueue(decisions);
  return (
    <>
      <PageTitle
        eyebrow="Decision history"
        title="Every call, accountable."
        copy="Ownership, rationale, and exact artifact identity stay attached to each decision."
      />
      <section className={styles.decisionGrid}>
        {[
          ["Due soon", groups.dueSoon],
          ["Open", groups.open],
          ["Resolved", groups.resolved],
        ].map(([label, items]) => (
          <div key={label as string}>
            <header>
              <span>{label as string}</span>
              <em>{(items as QueueDecision[]).length}</em>
            </header>
            {(items as QueueDecision[]).map((item) => (
              <article key={item.id}>
                <span className={styles.extensionAvatar}>
                  {initials(item.extension_id)}
                </span>
                <div>
                  <strong>{item.extension_id}</strong>
                  <code>@{item.version}</code>
                </div>
                <em>{humanize(item.decision)}</em>
              </article>
            ))}
            {!(items as QueueDecision[]).length ? (
              <p>No decisions here.</p>
            ) : null}
          </div>
        ))}
      </section>
    </>
  );
}
