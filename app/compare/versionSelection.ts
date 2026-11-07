type Version = { version?: string };

// Only order valid SemVer strings. A registry may contain other schemes, and
// array position or lexical ordering alone cannot establish a prior release.
function parseVersion(value: string) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split(".") || [];
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0"))) return null;
  return { core: match.slice(1, 4), prerelease };
}

function compareNumber(left: string, right: string) {
  return left.length - right.length || (left < right ? -1 : left > right ? 1 : 0);
}

function compareVersion(left: NonNullable<ReturnType<typeof parseVersion>>, right: NonNullable<ReturnType<typeof parseVersion>>) {
  for (let i = 0; i < 3; i++) {
    const result = compareNumber(left.core[i], right.core[i]);
    if (result) return result;
  }
  if (!left.prerelease.length || !right.prerelease.length) return Number(!left.prerelease.length) - Number(!right.prerelease.length);
  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    const a = left.prerelease[i]; const b = right.prerelease[i];
    if (a === undefined || b === undefined) return a === undefined ? -1 : 1;
    if (a === b) continue;
    const aNumber = /^\d+$/.test(a); const bNumber = /^\d+$/.test(b);
    if (aNumber && bNumber) return compareNumber(a, b);
    if (aNumber !== bNumber) return aNumber ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

export function chooseBaselineVersion(versions: Version[], preferred: string, target: string): string {
  const values = versions.map((item) => item.version || "").filter(Boolean);
  if (preferred && preferred !== target && values.includes(preferred)) return preferred;
  const parsedTarget = parseVersion(target);
  const candidates = values.map((value) => ({ value, parsed: parseVersion(value) }));
  if (!parsedTarget || !values.includes(target) || candidates.some((candidate) => !candidate.parsed)) return "";
  let best: { value: string; parsed: NonNullable<ReturnType<typeof parseVersion>> } | null = null;
  for (const candidate of candidates) {
    if (!candidate.parsed || compareVersion(candidate.parsed, parsedTarget) >= 0) continue;
    if (!best || compareVersion(candidate.parsed, best.parsed) > 0) best = { value: candidate.value, parsed: candidate.parsed };
  }
  return best?.value || "";
}
