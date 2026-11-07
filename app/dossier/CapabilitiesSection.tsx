import { Boxes, Network, Package, Terminal } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";

export type CapabilityRecord = Record<string, unknown>;

export function normalizeCapabilities(value: unknown): Record<string, CapabilityRecord> {
  if (Array.isArray(value)) {
    return Object.fromEntries(value.filter((item): item is CapabilityRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)).map((item, index) => [String(item.id || `capability-${index}`), item]));
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, CapabilityRecord> : {};
}

export default function CapabilitiesSection({ capabilities }: { capabilities: Record<string, CapabilityRecord> }) {
  const entries = Object.entries(capabilities);
  return <>
    <DossierSectionHead eyebrow="Capabilities" title="What this extension can access" detail="Check whether the access this package requests makes sense for what the extension does." />
    {entries.length ? <div className="dossierCapabilityGrid">{entries.map(([key, value]) => <article key={key}>{capabilityIcon(key)}<div><strong>{key.replaceAll("_", " ")}</strong><p>{Array.isArray(value.evidence) ? `${value.evidence.length} recorded location(s)` : "Declared or detected capability"}</p></div></article>)}</div> : <div className="dossierEmpty"><p>This scan did not record any capabilities.</p></div>}
  </>;
}

function capabilityIcon(key: string) {
  if (key.includes("network")) return <Network />;
  if (key.includes("shell") || key.includes("process")) return <Terminal />;
  if (key.includes("dependency")) return <Package />;
  return <Boxes />;
}
