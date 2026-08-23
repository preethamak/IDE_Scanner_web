// Always-on worker: reliably triggers the cron endpoints that deliver
// notifications and reconcile stranded scans, replacing flaky GitHub
// scheduled workflows. Optionally runs a scan command on an interval.
//
// Required env:
//   SITE_URL                  e.g. https://abscissa.dev (no trailing slash)
//   NOTIFICATION_CRON_SECRET  must match Vercel env of the same name
// Optional env:
//   SCAN_RECONCILE_SECRET     falls back to NOTIFICATION_CRON_SECRET
//   NOTIFICATION_TICK_SECONDS default 300
//   RECONCILE_TICK_SECONDS    default 600
//   SCAN_COMMAND              shell command to run for scanning (optional)
//   SCAN_INTERVAL_SECONDS     default 900

const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");
const NOTIFICATION_SECRET = process.env.NOTIFICATION_CRON_SECRET || "";
const RECONCILE_SECRET =
  process.env.SCAN_RECONCILE_SECRET || NOTIFICATION_SECRET;

if (!SITE_URL || !NOTIFICATION_SECRET) {
  console.error("worker: SITE_URL and NOTIFICATION_CRON_SECRET are required");
  process.exit(1);
}

const log = (...args) =>
  console.log(new Date().toISOString(), "worker", ...args);

async function tick(name, path, secret) {
  const started = Date.now();
  try {
    const response = await fetch(`${SITE_URL}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.text();
    log(name, response.status, `${Date.now() - started}ms`, body.slice(0, 300));
  } catch (error) {
    log(name, "ERROR", `${Date.now() - started}ms`, String(error));
  }
}

function every(seconds, fn) {
  const run = () => {
    try {
      fn();
    } catch (error) {
      log("tick-error", String(error));
    }
  };
  run();
  return setInterval(run, seconds * 1000);
}

const notificationSeconds = Number(process.env.NOTIFICATION_TICK_SECONDS) || 300;
const reconcileSeconds = Number(process.env.RECONCILE_TICK_SECONDS) || 600;

every(notificationSeconds, () =>
  tick("notifications", "/api/cron/notifications", NOTIFICATION_SECRET),
);
every(reconcileSeconds, () =>
  tick("reconcile", "/api/cron/reconcile-scans?grace_minutes=20", RECONCILE_SECRET),
);

const scanCommand = process.env.SCAN_COMMAND;
if (scanCommand) {
  const { spawn } = await import("node:child_process");
  const scanSeconds = Number(process.env.SCAN_INTERVAL_SECONDS) || 900;
  every(scanSeconds, () => {
    log("scan", "starting:", scanCommand);
    const child = spawn(scanCommand, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => log("scan", "exit", code));
  });
} else {
  log("no SCAN_COMMAND set; cron ticks only");
}

log(
  `up: notifications every ${notificationSeconds}s, reconcile every ${reconcileSeconds}s`,
);
