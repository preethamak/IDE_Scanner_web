-- Overdue decisions need a durable alert even when no new scan is ingested.
-- The unique team/dedupe key makes the scheduled call idempotent until the
-- decision is resolved or explicitly reopened.
create or replace function public.queue_team_decision_due_alerts(target_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_count integer;
begin
  insert into public.team_monitoring_alerts(
    team_id,
    extension_id,
    version,
    kind,
    severity,
    title,
    summary,
    metadata,
    dedupe_key
  )
  select
    decision.team_id,
    decision.extension_id,
    decision.version,
    'decision_due',
    'MEDIUM',
    left('Decision review overdue: ' || decision.extension_id || '@' || decision.version, 180),
    'An open team decision passed its review due date. Assign, resolve, or record a dismissal reason.',
    jsonb_build_object(
      'decision', decision.decision,
      'decision_id', decision.id,
      'due_at', decision.due_at,
      'coverage_percent', 100
    ),
    'decision-due:' || decision.id::text
  from public.team_decisions decision
  where decision.resolved_at is null
    and decision.due_at is not null
    and decision.due_at <= target_now
  on conflict (team_id, dedupe_key) do nothing;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke all on function public.queue_team_decision_due_alerts(timestamptz) from public, anon, authenticated;
grant execute on function public.queue_team_decision_due_alerts(timestamptz) to service_role;
