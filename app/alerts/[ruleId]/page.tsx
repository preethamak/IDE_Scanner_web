import { notFound } from "next/navigation";
import { getActiveRuleCatalog } from "@/lib/activeRuleCatalog";
import RuleAlert from "./RuleAlert";

export const dynamic = "force-dynamic";

export default async function AlertPage({ params }: { params: Promise<{ ruleId: string }> }) {
  const [{ ruleId }, catalog] = await Promise.all([params, getActiveRuleCatalog()]);
  const rule = catalog?.rules.find((item) => item.id === ruleId);
  if (!rule) notFound();
  return <RuleAlert rule={rule} />;
}
