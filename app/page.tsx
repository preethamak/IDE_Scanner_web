import type { Metadata } from "next";
import AuthorityLanding from "@/app/home/AuthorityLanding";

export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { url: "/", title: "VS Code Extension Security | GuardRails by Abscissa", description: "Inspect exact VS Code extension releases, review package evidence, and monitor meaningful changes with GuardRails." } };

export default function HomePage() {
  return <AuthorityLanding />;
}
