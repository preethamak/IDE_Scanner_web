import type { ReactNode } from "react";
import styles from "./primitives.module.css";

export default function Badge({children,tone="neutral",icon}:{children:ReactNode;tone?:"neutral"|"brand"|"info"|"allow"|"review"|"block";icon?:ReactNode}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{icon}{children}</span>;
}
