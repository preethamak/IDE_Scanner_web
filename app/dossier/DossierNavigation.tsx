import type { LucideIcon } from "lucide-react";

export type DossierNavigationItem<T extends string> = { id: T; label: string; icon: LucideIcon };

export default function DossierNavigation<T extends string>({ items, active, count, onSelect }: { items: DossierNavigationItem<T>[]; active: T; count: (item: T) => number; onSelect: (item: T) => void }) {
  const groups = [
    ["Decide", ["overview", "changes", "alerts"]],
    ["Inspect", ["readme", "capabilities", "dependencies", "files"]],
    ["Verify", ["versions", "publisher", "provenance", "coverage", "raw"]],
  ] as const;
  return <aside className="dossierRail" aria-label="Analysis Report index">
    <header><span>Report index</span><strong>Evidence map</strong><small>Choose a section without leaving this exact release.</small></header>
    {groups.map(([label, ids]) => <div className="dossierRailGroup" key={label}>
      <span>{label}</span>
      {ids.map((id) => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return null;
        const Icon = item.icon;
        return <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : ""} aria-current={active === item.id ? "page" : undefined} title={item.label} onClick={() => onSelect(item.id)}><Icon aria-hidden="true"/><span>{item.label}</span>{count(item.id) ? <b>{count(item.id)}</b> : null}</a>;
      })}
    </div>)}
  </aside>;
}
