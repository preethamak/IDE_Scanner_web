import Image from "next/image";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`guardrailsBrand ${compact ? "compact" : ""}`} aria-hidden="true"><Image src="/brand/guardrails-mark.png" width={compact ? 20 : 30} height={compact ? 20 : 30} alt="" unoptimized/></span>;
}
