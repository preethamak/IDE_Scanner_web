create table public.team_policies (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  capability text not null check (capability in ('terminal', 'network', 'filesystem', 'credentials', 'any')),
  action text not null check (action in ('allow', 'review', 'block')),
  applies_to text not null default 'watchlist' check (applies_to in ('all', 'watchlist')),
  enabled boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(team_id, capability)
);

alter table public.team_policies enable row level security;
create policy "members read team policies" on public.team_policies
  for select to authenticated using (public.is_team_member(team_id));
grant select on public.team_policies to authenticated;
-- Policy mutation is server mediated: the API verifies team role before writes.

alter table public.team_monitoring_alerts drop constraint team_monitoring_alerts_kind_check;
alter table public.team_monitoring_alerts add constraint team_monitoring_alerts_kind_check
  check (kind in ('release_detected', 'scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed', 'decision_due', 'policy_block'));

create or replace function public.evaluate_team_policies()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  watched_team record;
  policy record;
  matched jsonb;
  hit text;
  alert_title text;
  alert_summary text;
  alert_kind text;
  alert_severity text;
begin
  if new.analysis_status <> 'complete' or new.decision is null then return new; end if;
  if new.scan_purpose not in ('public_intelligence', 'benchmark', 'user_request') then return new; end if;
  matched := coalesce(new.capability_assessment->'matched', '[]'::jsonb);
  if jsonb_typeof(matched) <> 'array' or jsonb_array_length(matched) = 0 then return new; end if;
  for watched_team in
    select distinct w.team_id
    from public.team_watchlist_items w
    where w.extension_id = new.extension_id
  loop
    for policy in
      select * from public.team_policies
      where team_id = watched_team.team_id
        and enabled
        and (applies_to = 'watchlist')
    loop
      if policy.capability = 'any' then
        hit := coalesce(matched->>0, 'a listed capability');
      else
        select m into hit
        from jsonb_array_elements_text(matched) m
        where m ilike '%' || policy.capability || '%'
        limit 1;
      end if;
      if hit is null then continue; end if;
      if policy.action = 'block' and new.decision <> 'allow' then
        alert_kind := 'policy_block';
        alert_severity := 'HIGH';
        alert_title := 'Policy "' || policy.name || '" blocks ' || new.extension_id || '@' || new.version;
        alert_summary := 'Release gains ' || hit || ' and policy action is block. Record an exception or remove the extension.';
      elsif policy.action = 'review' and new.decision <> 'allow' then
        alert_kind := 'review_required';
        alert_severity := coalesce(new.severity, 'MEDIUM');
        alert_title := 'Policy "' || policy.name || '" requires review for ' || new.extension_id || '@' || new.version;
        alert_summary := 'Release gains ' || hit || '. Open the evidence and record the team decision.';
      else
        continue;
      end if;
      insert into public.team_monitoring_alerts(team_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
      values (watched_team.team_id, new.extension_id, new.version, new.id, alert_kind, alert_severity, alert_title, alert_summary,
        jsonb_build_object('policy_id', policy.id, 'policy_name', policy.name, 'policy_action', policy.action, 'matched_capability', hit, 'decision', new.decision),
        'policy:' || policy.id::text || ':' || new.id::text)
      on conflict (team_id, dedupe_key) do nothing;
    end loop;
  end loop;
  return new;
end;
$$;

drop trigger if exists team_policy_evaluation on public.scans;
create trigger team_policy_evaluation after insert on public.scans
for each row execute function public.evaluate_team_policies();
revoke all on function public.evaluate_team_policies() from public, anon, authenticated;
grant execute on function public.evaluate_team_policies() to service_role;
