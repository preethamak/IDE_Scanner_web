import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";
import styles from "./system.module.css";

type SurfaceVariant = "flat" | "raised" | "interactive";
type SurfacePadding = "none" | "sm" | "md" | "lg";
export default function Surface({ variant = "flat", padding = "md", className, ...props }: HTMLAttributes<HTMLDivElement> & { variant?: SurfaceVariant; padding?: SurfacePadding }) {
  return <div className={cn(styles.surface, variant !== "flat" && styles[variant], styles[`pad${padding[0].toUpperCase()}${padding.slice(1)}`], className)} {...props} />;
}
