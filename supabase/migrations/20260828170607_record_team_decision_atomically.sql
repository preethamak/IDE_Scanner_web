create or replace function public.record_team_decision_atomically(
  target_team uuid,
  actor uuid,
  target_scan uuid,
  desired_decision text,
  decision_rationale text,
  desired_assignee uuid default null,
  desired_due_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  scan_extension_id text;
  scan_version text;
  decision_row public.team_decisions%rowtype;
  event_id uuid;
  event_kind text;
  before_value jsonb;
  after_value jsonb;
  unchanged boolean := false;
begin
  perform 1 from public.teams where id = target_team for update;
  if not found then
    raise exception 'The selected workspace no longer exists.';
  end if;

  select role into actor_role
  from public.team_members
  where team_id = target_team and user_id = actor;
  if actor_role is null or actor_role not in ('owner', 'admin', 'analyst') then
    raise exception 'You no longer have permission to record team decisions.';
  end if;

  if desired_decision not in ('allow', 'review', 'block', 'exception') then
    raise exception 'Choose a valid team decision.';
  end if;
  if char_length(decision_rationale) > 4000 then
    raise exception 'Decision rationale is too long.';
  end if;

  select extension_id, version into scan_extension_id, scan_version
  from public.scans where id = target_scan;
  if scan_extension_id is null then
    raise exception 'Scan not found.';
  end if;

  if desired_assignee is not null and not exists (
    select 1 from public.team_members
    where team_id = target_team and user_id = desired_assignee
  ) then
    raise exception 'The assignee must be a member of this team.';
  end if;

  select * into decision_row
  from public.team_decisions
  where team_id = target_team and scan_id = target_scan
  for update;

  if found then
    before_value := jsonb_build_object(
      'decision', decision_row.decision,
      'rationale', decision_row.rationale,
      'assigned_to', decision_row.assigned_to,
      'due_at', decision_row.due_at,
      'resolved_at', decision_row.resolved_at
    );
  else
    before_value := null;
  end if;

  after_value := jsonb_build_object(
    'decision', desired_decision,
    'rationale', decision_rationale,
    'assigned_to', desired_assignee,
    'due_at', desired_due_at,
    'resolved_at', case
      when desired_decision = 'review' then null
      when found then coalesce(decision_row.resolved_at, now())
      else now()
    end
  );

  unchanged := before_value is not null and before_value = after_value;
  if unchanged then
    select event.id, event.kind into event_id, event_kind
    from public.team_decision_events event
    where event.decision_id = decision_row.id
    order by event.created_at desc, event.id desc
    limit 1;
    return jsonb_build_object(
      'created', false,
      'decision', to_jsonb(decision_row),
      'audit_receipt', jsonb_build_object(
        'event_id', event_id,
        'actor_id', actor,
        'kind', event_kind,
        'recorded_at', decision_row.updated_at
      )
    );
  end if;

  if before_value is null then
    insert into public.team_decisions(
      team_id, scan_id, extension_id, version, decision, rationale,
      assigned_to, due_at, resolved_at, created_by, updated_by
    ) values (
      target_team, target_scan, scan_extension_id, scan_version, desired_decision,
      decision_rationale, desired_assignee, desired_due_at,
      nullif(after_value ->> 'resolved_at', '')::timestamptz, actor, actor
    ) returning * into decision_row;
    event_kind := 'created';
  else
    update public.team_decisions set
      decision = desired_decision,
      rationale = decision_rationale,
      assigned_to = desired_assignee,
      due_at = desired_due_at,
      resolved_at = nullif(after_value ->> 'resolved_at', '')::timestamptz,
      updated_by = actor,
      updated_at = now()
    where id = decision_row.id
    returning * into decision_row;
    event_kind := case
      when before_value ->> 'resolved_at' is not null and after_value ->> 'resolved_at' is null then 'reopened'
      when before_value ->> 'resolved_at' is null and after_value ->> 'resolved_at' is not null then 'resolved'
      when before_value ->> 'assigned_to' is distinct from after_value ->> 'assigned_to' then 'assigned'
      else 'updated'
    end;
  end if;

  insert into public.team_decision_events(
    decision_id, actor_id, kind, before_value, after_value
  ) values (
    decision_row.id, actor, event_kind, coalesce(before_value, '{}'::jsonb), after_value
  ) returning id into event_id;

  insert into public.team_monitoring_alerts(
    team_id, extension_id, version, scan_id, kind, severity, title, summary,
    metadata, dedupe_key
  ) values (
    target_team, scan_extension_id, scan_version, target_scan, 'decision_changed', null,
    'Team decision ' || desired_decision || ': ' || scan_extension_id || '@' || scan_version,
    case when event_kind = 'assigned' then 'A team member changed ownership.' else 'A team member updated the recorded decision.' end,
    jsonb_build_object(
      'decision', desired_decision,
      'assigned_to', desired_assignee,
      'due_at', desired_due_at,
      'decision_event_id', event_id
    ),
    'decision:' || event_id::text
  ) on conflict (team_id, dedupe_key) do nothing;

  return jsonb_build_object(
    'created', before_value is null,
    'decision', to_jsonb(decision_row),
    'audit_receipt', jsonb_build_object(
      'event_id', event_id,
      'actor_id', actor,
      'kind', event_kind,
      'recorded_at', decision_row.updated_at
    )
  );
end;
$$;

revoke all on function public.record_team_decision_atomically(uuid, uuid, uuid, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.record_team_decision_atomically(uuid, uuid, uuid, text, text, uuid, timestamptz) to service_role;
