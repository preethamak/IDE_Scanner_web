create or replace function public.begin_scan_callback(
  p_job_id uuid,
  p_payload_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.scan_jobs%rowtype;
  v_receipt_id uuid;
  v_received_at timestamptz := now();
begin
  if p_payload_sha256 is null or p_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid callback payload identity';
  end if;

  select * into v_job
  from public.scan_jobs
  where id = p_job_id
  for update;
  if not found then
    raise exception 'Scan job was not found';
  end if;

  select id into v_receipt_id
  from public.scan_callback_receipts
  where job_id = p_job_id
    and payload_sha256 = p_payload_sha256
  order by received_at
  limit 1;
  if found then
    return v_receipt_id;
  end if;

  if v_job.status <> 'running' then
    raise exception 'A new callback is not valid for a % scan job', v_job.status;
  end if;

  insert into public.scan_callback_receipts (
    job_id, payload_sha256, outcome
  )
  values (p_job_id, p_payload_sha256, 'received')
  returning id into v_receipt_id;

  update public.scan_jobs
  set lifecycle_stage = 'ingesting',
      result_received_at = coalesce(result_received_at, v_received_at),
      updated_at = v_received_at,
      last_event_at = v_received_at
  where id = p_job_id;

  insert into public.scan_job_events (job_id, stage, event_type, detail)
  values (
    p_job_id,
    'ingesting',
    'callback_received',
    jsonb_build_object('receipt_id', v_receipt_id)
  );

  return v_receipt_id;
end;
$$;

revoke all on function public.begin_scan_callback(uuid, text)
from public, anon, authenticated;
grant execute on function public.begin_scan_callback(uuid, text)
to service_role;

comment on function public.begin_scan_callback(uuid, text) is
  'Atomically records and deduplicates a signed callback before ingestion.';

create or replace function public.finish_scan_callback(
  p_job_id uuid,
  p_receipt_id uuid,
  p_result text,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.scan_jobs%rowtype;
  v_receipt public.scan_callback_receipts%rowtype;
  v_finished_at timestamptz := now();
  v_status text;
  v_stage text;
  v_event_type text;
  v_receipt_outcome text;
  v_public_error text := left(coalesce(p_error, 'Scan callback failed.'), 2000);
begin
  if p_result is null or p_result not in ('worker_failed', 'artifact_incomplete', 'callback_rejected') then
    raise exception 'Invalid callback terminal result';
  end if;

  select * into v_job
  from public.scan_jobs
  where id = p_job_id
  for update;
  if not found then
    raise exception 'Scan job was not found';
  end if;

  select * into v_receipt
  from public.scan_callback_receipts
  where id = p_receipt_id
    and job_id = p_job_id
  for update;
  if not found then
    raise exception 'Scan callback receipt was not found';
  end if;

  v_status := case when p_result = 'artifact_incomplete' then 'incomplete' else 'failed' end;
  v_stage := case when v_status = 'incomplete' then 'completed' else 'failed' end;
  v_event_type := p_result;
  v_receipt_outcome := case when p_result = 'callback_rejected' then 'rejected' else 'accepted' end;

  if v_receipt.outcome = v_receipt_outcome and v_job.status = v_status then
    return v_status;
  end if;
  if v_receipt.outcome <> 'received' then
    raise exception 'Callback receipt already has a different terminal outcome';
  end if;
  if p_result = 'callback_rejected' and v_job.status in ('complete', 'incomplete', 'failed') then
    update public.scan_callback_receipts
    set outcome = 'rejected',
        error = v_public_error,
        completed_at = v_finished_at
    where id = p_receipt_id;
    insert into public.scan_job_events (job_id, stage, event_type, detail)
    values (
      p_job_id,
      coalesce(v_job.lifecycle_stage, v_job.status),
      v_event_type,
      jsonb_build_object(
        'receipt_id', p_receipt_id,
        'error', v_public_error,
        'preserved_terminal_status', v_job.status
      )
    );
    return v_job.status;
  end if;
  if v_job.status <> 'running' then
    raise exception 'Callback cannot finalize a % scan job', v_job.status;
  end if;

  update public.scan_jobs
  set status = v_status,
      lifecycle_stage = v_stage,
      error = case
        when p_result = 'callback_rejected' then 'The worker result could not be ingested.'
        else left(v_public_error, 1000)
      end,
      callback_error = case
        when p_result = 'callback_rejected' then left(v_public_error, 1000)
        else null
      end,
      completed_at = v_finished_at,
      lease_expires_at = null,
      updated_at = v_finished_at,
      last_event_at = v_finished_at
  where id = p_job_id;

  update public.extension_versions
  set scan_state = v_status
  where extension_id = v_job.extension_id
    and version = v_job.version;
  if not found then
    raise exception 'Extension version was not found';
  end if;

  update public.scan_callback_receipts
  set outcome = v_receipt_outcome,
      error = case when v_receipt_outcome = 'rejected' then v_public_error else null end,
      completed_at = v_finished_at
  where id = p_receipt_id;

  insert into public.scan_job_events (job_id, stage, event_type, detail)
  values (
    p_job_id,
    v_stage,
    v_event_type,
    jsonb_build_object('receipt_id', p_receipt_id, 'error', v_public_error)
  );

  insert into public.scan_runner_status (
    id, last_seen_at, last_failure_at, last_error
  )
  values (
    'github-actions',
    v_finished_at,
    case when p_result = 'callback_rejected' then null else v_finished_at end,
    case when p_result = 'callback_rejected' then null else left(v_public_error, 500) end
  )
  on conflict (id) do update
  set last_seen_at = excluded.last_seen_at,
      last_failure_at = coalesce(excluded.last_failure_at, public.scan_runner_status.last_failure_at),
      last_error = case
        when p_result = 'callback_rejected' then public.scan_runner_status.last_error
        else excluded.last_error
      end;

  return v_status;
end;
$$;

revoke all on function public.finish_scan_callback(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.finish_scan_callback(uuid, uuid, text, text)
to service_role;

comment on function public.finish_scan_callback(uuid, uuid, text, text) is
  'Atomically finalizes worker failure, acquisition failure, or callback rejection.';
