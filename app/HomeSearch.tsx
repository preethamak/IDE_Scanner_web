"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

export default function HomeSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter(); const [query, setQuery] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); const value = query.trim(); router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : "/catalog"); }
  return <form className={`productSearch ${compact ? "compact" : ""}`} onSubmit={submit}><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search extension name or publisher.extension" aria-label="Search extension intelligence"/><button>Explore results <ArrowRight/></button></form>;
}
