import type { LucideIcon } from "lucide-react";

export type DossierNavigationItem<T extends string> = { id: T; label: string; icon: LucideIcon };

export default function DossierNavigation<T extends string>({ items, active, count, onSelect }: { items: DossierNavigationItem<T>[]; active: T; count: (item: T) => number; onSelect: (item: T) => void }) {
  return <aside className="dossierRail" aria-label="Extension intelligence sections">
    <strong>Extension intelligence</strong>
    {items.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} title={label} onClick={() => onSelect(id)}><Icon aria-hidden="true"/><span>{label}</span>{count(id) ? <b>{count(id)}</b> : null}</a>)}
  </aside>;
}
