do $migration$
declare
  v_definition text;
  v_old_clause text :=
    'or (v_status <> ''complete'' and v_decision <> ''incomplete'') then';
  v_new_clause text :=
    'or (v_status <> ''complete'' and v_decision not in (''incomplete'', ''block'')) then';
begin
  select pg_get_functiondef(
    'public.publish_scan_result_storage(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,uuid)'::regprocedure
  )
  into v_definition;

  if v_definition is null or position(v_old_clause in v_definition) = 0 then
    raise exception
      'publish_scan_result_storage no longer contains the audited status/decision invariant';
  end if;

  v_definition := replace(v_definition, v_old_clause, v_new_clause);
  if position(v_old_clause in v_definition) <> 0
    or position(v_new_clause in v_definition) = 0 then
    raise exception
      'publish_scan_result_storage status/decision invariant was not replaced exactly';
  end if;

  execute v_definition;
end;
$migration$;

comment on function public.publish_scan_result_storage(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, uuid
) is
  'Transactional immutable scan storage. Incomplete analysis forbids approval but preserves an actionable block.';
