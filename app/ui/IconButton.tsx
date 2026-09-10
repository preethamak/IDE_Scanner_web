import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import type { ButtonSize } from "./Button";
import styles from "./system.module.css";

export default function IconButton({ label, size = "md", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: ButtonSize; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={cn(styles.iconButton, styles[size], className)} {...props}>{children}</button>;
}
