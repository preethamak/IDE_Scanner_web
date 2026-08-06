import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./primitives.module.css";

type Common = { children:ReactNode; icon?:ReactNode; trailingIcon?:ReactNode; tone?:"primary"|"secondary"|"quiet"|"danger"; size?:"sm"|"md"|"lg"; className?:string };
type LinkProps = Common & { href:string; external?:boolean };
type NativeProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?:never };

export default function Button(props:LinkProps|NativeProps) {
  const tone=props.tone||"primary"; const size=props.size||"md"; const className=`${styles.button} ${styles[tone]} ${styles[size]} ${props.className||""}`;
  const content=<>{props.icon?<span className={styles.icon}>{props.icon}</span>:null}<span>{props.children}</span>{props.trailingIcon?<span className={styles.icon}>{props.trailingIcon}</span>:null}</>;
  if("href" in props&&props.href){return props.external?<a className={className} href={props.href} target="_blank" rel="noreferrer">{content}</a>:<Link className={className} href={props.href}>{content}</Link>}
  const { children:_children,icon:_icon,trailingIcon:_trailingIcon,tone:_tone,size:_size,className:_className,...buttonProps }=props as NativeProps;
  void _children; void _icon; void _trailingIcon; void _tone; void _size; void _className;
  return <button className={className} {...buttonProps}>{content}</button>;
}
