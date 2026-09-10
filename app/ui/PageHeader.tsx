import type { ReactNode } from "react";
import styles from "./system.module.css";

export default function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className={styles.pageHeader}>{eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}{actions ? <div className={styles.headerActions}>{actions}</div> : null}</header>;
}
