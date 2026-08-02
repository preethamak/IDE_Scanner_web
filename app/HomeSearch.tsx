"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

export default function HomeSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter(); const [query, setQuery] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); const value = query.trim(); router.push(value ? `/registry?q=${encodeURIComponent(value)}` : "/registry"); }
  return <form className={`productSearch ${compact ? "compact" : ""}`} onSubmit={submit}><Search/><input name="extension" autoComplete="off" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Extension name or publisher.extension" aria-label="Search extensions"/><button>Search extensions <ArrowRight/></button></form>;
}
