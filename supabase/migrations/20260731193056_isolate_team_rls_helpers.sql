-- Keep RLS helper functions out of the exposed public API schema. Policies
-- can use these private helpers while PostgREST cannot publish them as RPCs.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.team_role(target_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.team_members
  where team_id = target_team and user_id = (select auth.uid())
$$;

create or replace function private.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.team_members where team_id = target_team and user_id = (select auth.uid()))
$$;

create or replace function private.can_manage_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select private.team_role(target_team) in ('owner', 'admin')
$$;

create or replace function private.can_decide_for_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select private.team_role(target_team) in ('owner', 'admin', 'analyst')
$$;

revoke all on function private.team_role(uuid), private.is_team_member(uuid), private.can_manage_team(uuid), private.can_decide_for_team(uuid) from public, anon;
grant execute on function private.team_role(uuid), private.is_team_member(uuid), private.can_manage_team(uuid), private.can_decide_for_team(uuid) to authenticated;

alter policy "team members can read teams" on public.teams using (private.is_team_member(id));
alter policy "owners can update teams" on public.teams using (private.team_role(id) = 'owner') with check (private.team_role(id) = 'owner');
alter policy "members can read memberships" on public.team_members using (private.is_team_member(team_id));
alter policy "members read team watchlist" on public.team_watchlist_items using (private.is_team_member(team_id));
alter policy "analysts manage team watchlist" on public.team_watchlist_items using (private.can_decide_for_team(team_id)) with check (private.can_decide_for_team(team_id));
alter policy "members read team decisions" on public.team_decisions using (private.is_team_member(team_id));
alter policy "analysts manage team decisions" on public.team_decisions with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
alter policy "analysts update team decisions" on public.team_decisions using (private.can_decide_for_team(team_id)) with check (private.can_decide_for_team(team_id) and updated_by = (select auth.uid()));
alter policy "members read decision events" on public.team_decision_events using (exists (select 1 from public.team_decisions d where d.id = decision_id and private.is_team_member(d.team_id)));
alter policy "actors append decision events" on public.team_decision_events with check (actor_id = (select auth.uid()) and exists (select 1 from public.team_decisions d where d.id = decision_id and private.can_decide_for_team(d.team_id)));
alter policy "members read team alerts" on public.team_monitoring_alerts using (private.is_team_member(team_id));
alter policy "members read team channel metadata" on public.team_notification_channels using (private.is_team_member(team_id));
alter policy "members read team deliveries" on public.team_notification_deliveries using (private.is_team_member(team_id));

revoke all on function public.team_role(uuid), public.is_team_member(uuid), public.can_manage_team(uuid), public.can_decide_for_team(uuid) from public, anon, authenticated;
