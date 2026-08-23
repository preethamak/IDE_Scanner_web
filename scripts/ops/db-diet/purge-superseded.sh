#!/usr/bin/env bash
# Reclaim database space by stripping heavy payloads from superseded scans.
#
# Keeps every `scans` row (decision summary, verdict, scores stay intact).
# Deletes only the child detail rows and inline JSON blobs attached to
# scans marked superseded_at IS NOT NULL, then compacts the tables.
#
# Usage: purge-superseded.sh <env-file-with-SUPABASE_PASSWORD> [--apply]
# Without --apply, prints counts only.
set -euo pipefail

ENV_FILE="${1:?usage: purge-superseded.sh <env-file> [--apply]}"
APPLY="${2:-}"
POOLER="host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.kmdujtabqaxgoeltbxpq sslmode=require"
export PGPASSWORD="$(grep '^SUPABASE_PASSWORD' "$ENV_FILE" | cut -d= -f2- | tr -d '\"')"

q() { psql "$POOLER" "$@"; }

echo "=== before ==="
q -c "SELECT pg_size_pretty(pg_database_size('postgres')) AS db_total;"

if [ "$APPLY" != "--apply" ]; then
  echo "DRY RUN - eligible rows:"
  q -tAc "SELECT 'artifact_files', count(*) FROM artifact_files af JOIN scans s ON s.id=af.scan_id WHERE s.superseded_at IS NOT NULL
          UNION ALL SELECT 'artifact_file_previews', count(*) FROM artifact_file_previews pv JOIN scans s ON s.id=pv.scan_id WHERE s.superseded_at IS NOT NULL
          UNION ALL SELECT 'findings', count(*) FROM findings f JOIN scans s ON s.id=f.scan_id WHERE s.superseded_at IS NOT NULL
          UNION ALL SELECT 'scans payloads nulled', count(*) FROM scans WHERE superseded_at IS NOT NULL;"
  echo "Re-run with --apply to execute."
  exit 0
fi

echo "Purging child rows in batched transactions..."
q <<'SQL'
DO $$
DECLARE
  last_id uuid := '00000000-0000-0000-0000-000000000000';
  batch uuid[];
  total int := 0;
BEGIN
  LOOP
    SELECT array_agg(id) INTO batch
    FROM (SELECT id FROM scans WHERE superseded_at IS NOT NULL AND id > last_id ORDER BY id LIMIT 100) b;
    EXIT WHEN batch IS NULL;
    DELETE FROM artifact_file_previews WHERE scan_id = ANY(batch);
    DELETE FROM artifact_files WHERE scan_id = ANY(batch);
    DELETE FROM findings WHERE scan_id = ANY(batch);
    total := total + array_length(batch, 1);
    last_id := batch[array_length(batch, 1)];
    COMMIT;
  END LOOP;
  RAISE NOTICE 'purged children of % superseded scans', total;
END $$;
SQL

echo "Stripping inline payloads on superseded scans (columns are NOT NULL, use empty object)..."
q -q -c "UPDATE scans SET canonical_report = '{}'::jsonb, artifact_inventory = '{}'::jsonb WHERE superseded_at IS NOT NULL;"

echo "Compacting tables (brief locks)..."
q -q -c "VACUUM (FULL, ANALYZE) artifact_files;" \
       -c "VACUUM (FULL, ANALYZE) artifact_file_previews;" \
       -c "VACUUM (FULL, ANALYZE) findings;" \
       -c "VACUUM (FULL, ANALYZE) scans;"

q -c "=== after ===" \
   -c "SELECT pg_size_pretty(pg_database_size('postgres')) AS db_total;" \
   -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size FROM pg_stat_user_tables WHERE relname IN ('artifact_files','artifact_file_previews','scans','findings') ORDER BY pg_total_relation_size(relid) DESC;"
