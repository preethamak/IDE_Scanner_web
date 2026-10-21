create table public.api_key_rate_windows (
  key_id uuid not null references public.api_keys(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (key_id, window_started_at)
);

create or replace function public.consume_api_key_rate_budget(
  p_key_id uuid,
  p_limit integer,
  p_window_seconds integer default 60
)
returns table(allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  used integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then raise exception 'rate budget parameters must be positive'; end if;
  current_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into api_key_rate_windows(key_id, window_started_at, request_count)
  values (p_key_id, current_window, 1)
  on conflict (key_id, window_started_at) do update
    set request_count = api_key_rate_windows.request_count + 1
    where api_key_rate_windows.request_count < p_limit
  returning request_count into used;
  if found then return query select true, greatest(p_limit - used, 0), greatest(1, p_window_seconds - mod(extract(epoch from clock_timestamp())::integer, p_window_seconds)); return; end if;
  return query select false, 0, greatest(1, p_window_seconds - mod(extract(epoch from clock_timestamp())::integer, p_window_seconds));
end;
$$;

revoke all on function public.consume_api_key_rate_budget(uuid, integer, integer) from public;
grant execute on function public.consume_api_key_rate_budget(uuid, integer, integer) to service_role;
