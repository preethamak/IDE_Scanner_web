import type { LucideIcon } from "lucide-react";
import styles from "./reportSidebar.module.css";

export type ReportSection = "summary" | "changes" | "evidence" | "capabilities" | "package" | "publisher" | "coverage" | "technical";
export type ReportSidebarItem = { id: ReportSection; label: string; icon: LucideIcon; count?: number };

export default function ReportSidebar({ items, active, onSelect }: { items: ReportSidebarItem[]; active: ReportSection; onSelect: (section: ReportSection) => void }) {
  return <>
    <label className={styles.mobile}><span>Report section</span><select value={active} onChange={(event) => onSelect(event.target.value as ReportSection)}>{items.map((item) => <option key={item.id} value={item.id}>{item.label}{item.count ? ` (${item.count})` : ""}</option>)}</select></label>
    <aside className={styles.sidebar} aria-label="Report sections">
      <span>Exact-release report</span>
      <nav>{items.map(({ id, label, icon: Icon, count }) => <a key={id} href={`#${id}`} className={active === id ? styles.active : ""} aria-current={active === id ? "page" : undefined} onClick={() => onSelect(id)}><Icon/><strong>{label}</strong>{count ? <b>{count}</b> : null}</a>)}</nav>
      <p>Every section stays bound to the artifact and scan shown above.</p>
    </aside>
  </>;
}
