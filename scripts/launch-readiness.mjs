import { spawnSync } from "node:child_process";
import "./verify-node-runtime.mjs";
import { verifyLaunchHealth } from "./verify-launch-health.mjs";

const commands = [
  ["npm", ["run", "lint"]],
  ["npx", ["tsc", "--noEmit"]],
  ["npm", ["run", "test"]],
  ["npm", ["run", "test:public-corpus"]],
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
  await verifyLaunchHealth(baseUrl, secret);
}

console.log(process.argv.includes("--with-health") ? "Local quality checks and protected production health passed." : "Local quality checks passed. Production health was not checked; run with --with-health before launch.");
