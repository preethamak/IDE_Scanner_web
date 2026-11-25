"use client";
import { usePathname } from "next/navigation";
/** Public-site analytics and feedback have no role in the private admin UI. */
export default function PublicSiteTools({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path.startsWith("/admin") ? null : children;
}
