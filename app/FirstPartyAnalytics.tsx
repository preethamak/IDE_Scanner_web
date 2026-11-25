"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendFirstPartyEvent } from "@/lib/firstPartyAnalytics";
export default function FirstPartyAnalytics() {
  const path = usePathname();
  useEffect(() => {
    const record = () => sendFirstPartyEvent("page_view", path);
    record();
    window.addEventListener("guardrails:consent-changed", record);
    return () => window.removeEventListener("guardrails:consent-changed", record);
  }, [path]);
  return null;
}
