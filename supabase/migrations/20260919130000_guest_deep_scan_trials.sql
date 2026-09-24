create table if not exists public.guest_deep_scan_trials(
  trial_key text primary key,
  scan_count integer not null default 0 check (scan_count >= 0),
  window_started_at timestamptz not null default now(),
  last_scan_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.guest_deep_scan_access(
  job_id uuid primary key references public.scan_jobs(id) on delete cascade,
  token_hash text not null,
  trial_key text not null references public.guest_deep_scan_trials(trial_key) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists guest_deep_scan_access_token_idx
  on public.guest_deep_scan_access(token_hash, created_at desc);

alter table public.guest_deep_scan_trials enable row level security;
alter table public.guest_deep_scan_access enable row level security;
revoke all on public.guest_deep_scan_trials from public, anon, authenticated;
revoke all on public.guest_deep_scan_access from public, anon, authenticated;
grant all on public.guest_deep_scan_trials to service_role;
grant all on public.guest_deep_scan_access to service_role;

create or replace function public.consume_guest_deep_scan_trial(
  p_trial_key text,
  p_limit integer default 5,
  p_window_days integer default 30
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  trial public.guest_deep_scan_trials;
begin
  if length(trim(coalesce(p_trial_key, ''))) < 16 then
    raise exception 'Guest trial could not be verified.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_trial_key, 0));

  select * into trial
  from public.guest_deep_scan_trials
  where trial_key = p_trial_key
  for update;

  if not found or trial.window_started_at <= now() - make_interval(days => greatest(p_window_days, 1)) then
    insert into public.guest_deep_scan_trials(trial_key, scan_count, window_started_at, last_scan_at)
    values (p_trial_key, 1, now(), now())
    on conflict (trial_key) do update set
      scan_count = 1,
      window_started_at = now(),
      last_scan_at = now();
    return greatest(p_limit - 1, 0);
  end if;

  if trial.scan_count >= p_limit then
    return -1;
  end if;

  update public.guest_deep_scan_trials
  set scan_count = scan_count + 1, last_scan_at = now()
  where trial_key = p_trial_key;
  return greatest(p_limit - trial.scan_count - 1, 0);
end;
$$;

revoke all on function public.consume_guest_deep_scan_trial(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_guest_deep_scan_trial(text, integer, integer)
  to service_role;
