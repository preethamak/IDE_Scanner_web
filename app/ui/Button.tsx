import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { variants } from "@/lib/ui/variants";
import styles from "./system.module.css";

export type ButtonTone = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
type Common = { children: ReactNode; icon?: ReactNode; trailingIcon?: ReactNode; tone?: ButtonTone; size?: ButtonSize; className?: string };
type LinkProps = Common & { href: string; external?: boolean };
type NativeProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

const buttonClass = variants(styles.control, { tone: { primary: styles.primary, secondary: styles.secondary, outline: styles.outline, ghost: styles.ghost, danger: styles.danger }, size: { sm: styles.sm, md: styles.md, lg: styles.lg } }, { tone: "primary", size: "md" });

export default function Button(props: LinkProps | NativeProps) {
  const className = buttonClass({ tone: props.tone, size: props.size }, props.className);
  const content = <>{props.icon ? <span className={styles.icon}>{props.icon}</span> : null}<span>{props.children}</span>{props.trailingIcon ? <span className={styles.icon}>{props.trailingIcon}</span> : null}</>;
  if ("href" in props && props.href) return props.external ? <a className={className} href={props.href} target="_blank" rel="noreferrer">{content}</a> : <Link className={className} href={props.href}>{content}</Link>;
  const { children: _children, icon: _icon, trailingIcon: _trailingIcon, tone: _tone, size: _size, className: _className, ...buttonProps } = props as NativeProps;
  void _children; void _icon; void _trailingIcon; void _tone; void _size; void _className;
  return <button className={className} {...buttonProps}>{content}</button>;
}
