export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`guardrailsBrand ${compact ? "compact" : ""}`} aria-hidden="true"><i/><b/><i/></span>;
}
