import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const app = join(root, "app");
const limits = { important: 1225, globalImports: 10, rawButtons: 203, workspaceLines: 3441 };
const files = [];
function walk(directory) { for (const name of readdirSync(directory)) { const path = join(directory, name); if (statSync(path).isDirectory()) walk(path); else files.push(path); } }
walk(app);
const text = (path) => readFileSync(path, "utf8");
const css = files.filter((file) => extname(file) === ".css");
const routeTsx = files.filter((file) => extname(file) === ".tsx" && !relative(app, file).startsWith("ui/"));
const layout = text(join(app, "layout.tsx"));
const metrics = {
  important: css.reduce((sum, file) => sum + (text(file).match(/!important/g)?.length ?? 0), 0),
  globalImports: layout.match(/import "\.\/[^\"]+\.css";/g)?.length ?? 0,
  rawButtons: routeTsx.reduce((sum, file) => sum + (text(file).match(/<button\b/g)?.length ?? 0), 0),
  workspaceLines: text(join(app, "TeamWorkspace.tsx")).trimEnd().split("\n").length,
};
let failed = false;
for (const [name, value] of Object.entries(metrics)) {
  const limit = limits[name];
  const ok = value <= limit;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${value} (baseline ceiling ${limit})`);
  if (!ok) failed = true;
}
const ownedUiCss = css.filter((file) => relative(app, file).startsWith("ui/")).map((file) => text(file)).join("\n");
if (ownedUiCss.includes("!important")) { console.error("FAIL app/ui styles may not use !important"); failed = true; }
if (failed) process.exitCode = 1;
