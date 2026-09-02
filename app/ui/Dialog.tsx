"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton";
import styles from "./system.module.css";

export default function Dialog({ open, onClose, title, description, children, actions }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; actions?: ReactNode }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter((node) => !node.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className={styles.dialogBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}><div className={styles.dialogHeader}><div><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div><IconButton label="Close dialog" onClick={onClose}><X /></IconButton></div>{children ? <div className={styles.dialogBody}>{children}</div> : null}{actions ? <div className={styles.dialogActions}>{actions}</div> : null}</div></div>;
}
