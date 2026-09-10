"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";
import styles from "./system.module.css";

type Shared = { label: string; description?: string; error?: string; className?: string; control?: ReactNode };
type InputProps = Shared & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = Shared & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };
export default function Field(props: InputProps | TextareaProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const descriptionId = props.description ? `${id}-description` : undefined;
  const errorId = props.error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const { label, description, error, className, control, multiline, ...controlProps } = props;
  return <label className={cn(styles.field, className)} htmlFor={id}><span className={styles.fieldLabel}>{label}</span>{description ? <span id={descriptionId} className={styles.fieldDescription}>{description}</span> : null}{control ?? (multiline ? <textarea id={id} className={styles.fieldControl} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>} /> : <input id={id} className={styles.fieldControl} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...controlProps as InputHTMLAttributes<HTMLInputElement>} />)}{error ? <span id={errorId} className={styles.fieldError}>{error}</span> : null}</label>;
}
