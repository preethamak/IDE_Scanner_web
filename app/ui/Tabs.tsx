"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./system.module.css";

export type TabItem = { id: string; label: ReactNode; content: ReactNode };
export default function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const baseId = useId();
  const [selected, setSelected] = useState(defaultValue ?? items[0]?.id);
  const selectRelative = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    setSelected(items[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };
  const active = items.find((item) => item.id === selected) ?? items[0];
  return <div><div className={styles.tabs} role="tablist">{items.map((item, index) => <button key={item.id} id={`${baseId}-tab-${item.id}`} className={styles.tab} type="button" role="tab" aria-selected={active?.id === item.id} aria-controls={`${baseId}-panel-${item.id}`} tabIndex={active?.id === item.id ? 0 : -1} onClick={() => setSelected(item.id)} onKeyDown={(event) => selectRelative(event, index)}>{item.label}</button>)}</div>{active ? <div className={styles.tabPanel} id={`${baseId}-panel-${active.id}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active.id}`}>{active.content}</div> : null}</div>;
}
