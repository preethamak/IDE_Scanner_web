import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync("app", { recursive: true }).filter((file) => String(file).endsWith(".css"));
const declarationPattern = /font(?:-size)?\s*:[^;}]+/g;
const tinyValuePattern = /(?<![\d.])(?:[0-9]|10|11)px(?![\d.])/;
const findings = files.flatMap((file) => {
  const declarations = readFileSync(join("app", String(file)), "utf8").match(declarationPattern) || [];
  return declarations.filter((declaration) => tinyValuePattern.test(declaration)).map((declaration) => ({ file: String(file), declaration }));
});
if (findings.length) {
  console.error(`Typography audit failed: ${findings.length} declarations are below the 12px product minimum.`);
  console.error(findings.slice(0, 20).map((item) => `${item.file}: ${item.declaration}`).join("\n"));
  process.exit(1);
}
console.log("Typography audit: 0 declarations below the 12px product minimum.");
