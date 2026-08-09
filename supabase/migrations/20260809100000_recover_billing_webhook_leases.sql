alter table public.billing_webhook_events
  add column if not exists processing_started_at timestamptz;

update public.billing_webhook_events
set processing_started_at = coalesce(processed_at, provider_created_at, now())
where status = 'processing' and processing_started_at is null;

create or replace function public.claim_billing_webhook_event_v2(
  event_id text,
  event_name text,
  event_created_at timestamptz
) returns text
language plpgsql security definer set search_path = public as $$
declare
  existing_status text;
  existing_started_at timestamptz;
begin
  insert into public.billing_webhook_events(
    provider_event_id, event_type, provider_created_at, status, attempts,
    processing_started_at
  ) values (
    event_id, event_name, event_created_at, 'processing', 1, now()
  )
  on conflict (provider_event_id) do nothing;

  if found then return 'claimed'; end if;

  select status, processing_started_at
    into existing_status, existing_started_at
    from public.billing_webhook_events
    where provider_event_id = event_id
    for update;

  if existing_status = 'processed' then return 'processed'; end if;
  if existing_status = 'processing'
     and existing_started_at is not null
     and existing_started_at > now() - interval '10 minutes' then
    return 'busy';
  end if;

  update public.billing_webhook_events
  set status = 'processing',
      attempts = attempts + 1,
      last_error = null,
      processing_started_at = now()
  where provider_event_id = event_id;
  return 'claimed';
end;
$$;

create or replace function public.finish_billing_webhook_event(
  event_id text,
  succeeded boolean,
  failure_message text default null
) returns void
language sql security definer set search_path = public as $$
  update public.billing_webhook_events
  set status = case when succeeded then 'processed' else 'failed' end,
      processed_at = case when succeeded then now() else null end,
      processing_started_at = null,
      last_error = case when succeeded then null else left(failure_message, 500) end
  where provider_event_id = event_id and status = 'processing';
$$;

revoke all on function public.claim_billing_webhook_event_v2(text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_billing_webhook_event_v2(text,text,timestamptz)
  to service_role;

comment on function public.claim_billing_webhook_event_v2(text,text,timestamptz) is
  'Claims new, failed, or abandoned billing events. Returns busy for a live lease and processed for a completed event.';
