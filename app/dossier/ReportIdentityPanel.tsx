import { Fingerprint } from "lucide-react";
import type { ReportScan } from "@/lib/reportContract";

export default function ReportIdentityPanel({ scan }: { scan: ReportScan }) {
  return <article className="identityCard"><Fingerprint/><span>Exact artifact</span><code>{scan.artifact_sha256}</code><p>Build {String(scan.scanner_build || "not recorded").slice(0, 12)} · ruleset {String(scan.ruleset_version || "not recorded")}</p></article>;
}
