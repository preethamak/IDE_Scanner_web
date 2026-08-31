import { getActiveRuleCatalog } from "@/lib/activeRuleCatalog";
import MetricsCatalog from "./MetricsCatalog";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  return <MetricsCatalog catalog={await getActiveRuleCatalog()} />;
}
