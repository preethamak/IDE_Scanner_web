"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return <nav className="primaryNav" aria-label="Primary navigation">{items.map((item) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
  })}</nav>;
}
