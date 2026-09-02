import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import Button from "./Button";
import { cn } from "@/lib/ui/cn";
import styles from "./system.module.css";

export default function StatePanel({ state = "empty", title, body, action }: { state?: "empty" | "error" | "loading"; title: string; body: string; action?: { label: string; href?: string; onClick?: () => void } }) {
  const Icon = state === "error" ? CircleAlert : state === "loading" ? LoaderCircle : Inbox;
  return <section className={cn(styles.statePanel, styles[state])} aria-live={state === "error" ? "assertive" : "polite"}><span className={styles.stateIcon}><Icon /></span><h3>{title}</h3><p>{body}</p>{action ? (action.href ? <Button href={action.href} tone="secondary">{action.label}</Button> : <Button type="button" onClick={action.onClick} tone="secondary">{action.label}</Button>) : null}</section>;
}
