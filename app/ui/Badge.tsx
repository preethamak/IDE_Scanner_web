import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import styles from "./system.module.css";

export type BadgeTone = "neutral" | "brand" | "info" | "allow" | "review" | "block";
export default function Badge({ children, tone = "neutral", icon, className }: { children: ReactNode; tone?: BadgeTone; icon?: ReactNode; className?: string }) {
  return <span className={cn(styles.badge, tone !== "neutral" && styles[tone], className)}>{icon}{children}</span>;
}
