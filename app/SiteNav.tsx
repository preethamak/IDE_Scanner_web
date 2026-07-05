"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; meta: string };

export default function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="siteNav" aria-label="Primary navigation">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            href={item.href}
            key={item.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span>{item.label}</span>
            <small>{item.meta}</small>
          </Link>
        );
      })}
    </nav>
  );
}
