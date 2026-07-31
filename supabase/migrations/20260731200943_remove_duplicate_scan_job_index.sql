-- Identical to scan_jobs_deep_claim_priority. Keep the earlier canonical index
-- used by the queue-claim migration and remove the redundant write overhead.
drop index if exists public.scan_jobs_user_queue_priority;
