import { permanentRedirect } from "next/navigation";

export default async function ScanCompatibilityRedirect({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const { q, mode } = await searchParams;
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (mode) query.set("mode", mode);
  permanentRedirect(`/analyze${query.size ? `?${query}` : ""}`);
}
