#!/usr/bin/env bash
# One Deep Scan cycle, portable off GitHub Actions: enqueue -> claim ->
# analyze exact artifact -> signed callback. Mirrors
# ide-scanner/.github/workflows/deep-scan.yml.
#
# Required env:
#   SITE_URL                 https://abscissa.dev
#   SCAN_RUNNER_SECRET       matches Vercel/GitHub secret of the same name
#   SCAN_CALLBACK_SECRET     matches the callback secret
# Optional env:
#   DEEP_SCAN_REPO           clone target, default /tmp/deep-scanner
#   DEEP_SCAN_REPO_URL       default https://github.com/preethamak/ide-scanner
set -euo pipefail

SITE_URL="${SITE_URL%/}"
REPO="${DEEP_SCAN_REPO:-/tmp/deep-scanner}"
REPO_URL="${DEEP_SCAN_REPO_URL:-https://github.com/preethamak/ide-scanner}"

log() { echo "$(date -u +%FT%TZ) deep-scan" "$*"; }

if [ ! -d "$REPO/.git" ]; then
  log "cloning scanner"
  rm -rf "$REPO"
  git clone --depth 1 "$REPO_URL" "$REPO"
fi
cd "$REPO"

if ! python -c "import ide_scanner" >/dev/null 2>&1; then
  log "installing analyzers"
  python -m pip install --quiet -e ".[analysis]"
fi

export GITHUB_OUTPUT="$(mktemp)"
trap 'rm -f "$GITHUB_OUTPUT"' EXIT

export SCAN_ENQUEUE_URL="$SITE_URL/api/internal/scan-jobs/enqueue"
export SCAN_CLAIM_URLS="$SITE_URL/api/internal/scan-jobs/claim"
export SCAN_RUNNER_ID="${SCAN_RUNNER_ID:-heroku-worker}"
export IDE_SCANNER_REQUIRE_PROVIDERS="semgrep,yara,dependency_intelligence"
export IDE_SCANNER_MAX_VSIX_BYTES=268435456
export IDE_SCANNER_VSIX_DOWNLOAD_TIMEOUT=180

enqueue_out="$(mktemp)"
python scripts/enqueue_scan.py >"$enqueue_out" 2>&1 || log "enqueue step skipped: $(tail -1 "$enqueue_out")"
CLAIM_JOB_ID="$(sed -n 's/^job_id=//p' "$GITHUB_OUTPUT" | tail -1)"

rm -f "$GITHUB_OUTPUT"; touch "$GITHUB_OUTPUT"
SCAN_JOB_ID="${CLAIM_JOB_ID:-}" python scripts/claim_scan.py

has_job="$(sed -n 's/^has_job=//p' "$GITHUB_OUTPUT" | tail -1)"
if [ "$has_job" != "true" ]; then
  log "no queued job"
  exit 0
fi

extension_id="$(sed -n 's/^extension_id=//p' "$GITHUB_OUTPUT" | tail -1)"
version="$(sed -n 's/^version=//p' "$GITHUB_OUTPUT" | tail -1)"
callback_url="$(sed -n 's/^callback_url=//p' "$GITHUB_OUTPUT" | tail -1)"
job_id="$(sed -n 's/^job_id=//p' "$GITHUB_OUTPUT" | tail -1)"
log "claimed $extension_id@$version"

analyze_failed=0
semgrep --validate --config rules/semgrep/vscode-security.yml || true
if ! python -m ide_scanner scan \
    --extension-id "$extension_id" \
    --version "$version" \
    --profile deep \
    --online \
    --format bundle.json \
    --include-raw-evidence \
    --output scan-bundle.json; then
  analyze_failed=1
fi

if [ "$analyze_failed" -eq 0 ]; then
  SCAN_JOB_ID="$job_id" SCAN_CALLBACK_URL="$callback_url" \
    python scripts/callback_scan.py scan-bundle.json
  log "result submitted for job $job_id"
else
  SCAN_JOB_ID="$job_id" SCAN_CALLBACK_URL="$callback_url" \
    SCAN_ERROR="Deep Scan failed before a canonical report was produced." \
    python scripts/callback_scan.py
  log "failure reported for job $job_id"
fi
