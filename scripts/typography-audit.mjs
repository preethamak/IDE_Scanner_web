import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync("app", { recursive: true }).filter((file) => String(file).endsWith(".css"));
const tinyPattern = /font(?:-size)?\s*:[^;}]*\b(?:[0-9]|10)px\b/g;
const findings = files.flatMap((file) => {
  const matches = readFileSync(join("app", String(file)), "utf8").match(tinyPattern) || [];
  return matches.map((declaration) => ({ file: String(file), declaration }));
});
const legacyBudget = 627;
if (findings.length > legacyBudget) {
  console.error(`Typography audit failed: ${findings.length} tiny declarations exceed the migration budget of ${legacyBudget}.`);
  console.error(findings.slice(-10).map((item) => `${item.file}: ${item.declaration}`).join("\n"));
  process.exit(1);
}
console.log(`Typography audit: ${findings.length}/${legacyBudget} legacy declarations. New UI must use --font-xs (12px) or larger.`);
