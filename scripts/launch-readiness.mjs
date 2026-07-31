import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "lint"]],
  ["npx", ["tsc", "--noEmit"]],
  ["npm", ["run", "test"]],
  ["npm", ["run", "test:e2e"]],
  ["npm", ["run", "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (process.argv.includes("--with-health")) {
  const baseUrl = process.env.LAUNCH_HEALTH_URL;
  const secret = process.env.LAUNCH_HEALTH_SECRET;
  if (!baseUrl || !secret) {
    console.error("LAUNCH_HEALTH_URL and LAUNCH_HEALTH_SECRET are required with --with-health.");
    process.exit(1);
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/launch-health`, { headers: { Authorization: `Bearer ${secret}` } });
  if (!response.ok) {
    console.error(`Launch health failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
}

console.log("Launch readiness checks passed.");
