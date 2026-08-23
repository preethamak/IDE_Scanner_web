# Guardrails worker

Always-on dyno that reliably triggers notification delivery and scan
reconciliation. Replaces GitHub scheduled workflows as the scheduler.

## What it does

- Every 5 min: `POST /api/cron/notifications` — sends pending/failed
  notification deliveries (email, webhooks, Jira) and queues decision-due
  alerts.
- Every 10 min: `POST /api/cron/reconcile-scans` — force-finishes deep scan
  jobs stuck non-terminal.
- Optional: runs `SCAN_COMMAND` every `SCAN_INTERVAL_SECONDS` for scanning
  workloads (e.g. a guardrails CLI runner loop).

## Deploy to Heroku (Basic dyno, covered by the $13/mo student credit)

```bash
# 1. From the repo root
heroku create guardrails-worker

# 2. Point heroku git at only the worker/ subtree
git subtree push --prefix worker heroku main

# 3. Config vars (must match Vercel env values)
heroku config:set \
  SITE_URL=https://abscissa.dev \
  NOTIFICATION_CRON_SECRET='<same value as Vercel NOTIFICATION_CRON_SECRET>' \
  SCAN_RECONCILE_SECRET='<same value as Vercel, or omit to reuse the above>'

# 4. Run it
heroku ps:scale worker=1:basic
heroku logs --tail
```

Expected log lines every few minutes:

```
... worker notifications 200 4123ms {"delivered":N,...}
... worker reconcile 200 890ms {"reconciled":0}
```

## Secrets

`NOTIFICATION_CRON_SECRET` must be set in **both** places:

- Vercel (ide-scanner-web) — the cron routes reject requests without it
- Heroku (this worker) — proves the tick is legitimate

Generate with: `openssl rand -hex 32`

## Scanning on this box (Deep Scan runner mode)

This replaces the flaky `ide-scanner/.github/workflows/deep-scan.yml`
scheduled workflow (GitHub delays/skips scheduled runs, which is why the
corpus aged out and catalog refresh started failing).

Setup:

```bash
# Buildpacks: node runs the ticker, python runs the scanner
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add heroku/python

# Scanner secrets (same values as the repo's GitHub Actions secrets;
# if you cannot read the old values, rotate: new value into BOTH
# GitHub secrets and Heroku config)
heroku config:set SCAN_RUNNER_SECRET='<value>' SCAN_CALLBACK_SECRET='<value>'
heroku config:set SCAN_COMMAND='bash /app/deep-scan.sh' SCAN_INTERVAL_SECONDS=300
git subtree push --prefix worker heroku main
```

`deep-scan.sh` clones `preethamak/ide-scanner` (depth 1) on first run,
installs analyzers, then each cycle: enqueues a canonical maintenance scan,
claims the next prioritized job, scans the exact artifact (semgrep, yara,
dependency intelligence), and submits the signed callback. The 503 health
gate in catalog-refresh clears once fresh scans land (corpus < 30h old).

## Secrets

