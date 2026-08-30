import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

export function readWorkspaceSurfaceSource() {
  const viewsDir = path.join(root, "app/workspace/views");
  const viewFiles = fs.existsSync(viewsDir)
    ? fs
        .readdirSync(viewsDir, { recursive: true })
        .filter(
          (file) =>
            /\.(tsx|ts)$/.test(String(file)) && !String(file).includes(".test."),
        )
        .map((file) => path.join(viewsDir, String(file)))
    : [];
  return [path.join(root, "app/TeamWorkspace.tsx"), ...viewFiles]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}
