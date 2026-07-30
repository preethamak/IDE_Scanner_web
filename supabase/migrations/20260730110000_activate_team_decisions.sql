-- Activate the previously deferred team domain without weakening the existing
-- personal watchlist or public-report policies.
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check check (role in ('owner', 'admin', 'analyst', 'viewer'));
alter table public.team_invitations drop constraint if exists team_invitations_role_check;
alter table public.team_invitations add constraint team_invitations_role_check check (role in ('admin', 'analyst', 'viewer'));

create table public.team_decisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  extension_id text not null references public.extensions(id) on delete cascade,
  version text not null,
  decision text not null check (decision in ('allow', 'review', 'block', 'exception')),
  rationale text not null default '' check (char_length(rationale) <= 4000),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, scan_id)
);

create table public.team_decision_events (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.team_decisions(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  kind text not null check (kind in ('created', 'updated', 'assigned', 'resolved', 'reopened')),
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index team_decisions_queue on public.team_decisions(team_id, resolved_at, due_at, updated_at desc);
create index team_decision_events_history on public.team_decision_events(decision_id, created_at desc);

create or replace function public.team_role(target_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.team_members
  where team_id = target_team and user_id = (select auth.uid())
$$;

create or replace function public.can_manage_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.team_role(target_team) in ('owner', 'admin')
$$;

create or replace function public.can_decide_for_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.team_role(target_team) in ('owner', 'admin', 'analyst')
$$;

alter table public.team_decisions enable row level security;
alter table public.team_decision_events enable row level security;

drop policy if exists "team access" on public.teams;
drop policy if exists "team members access" on public.team_members;
drop policy if exists "team invitations access" on public.team_invitations;
drop policy if exists "team watchlist access" on public.team_watchlist_items;
drop policy if exists "team triage access" on public.finding_triage;
drop policy if exists "team comments access" on public.finding_comments;

create policy "team members can read teams" on public.teams for select to authenticated using (public.is_team_member(id));
create policy "owners can update teams" on public.teams for update to authenticated using (public.team_role(id) = 'owner') with check (public.team_role(id) = 'owner');
create policy "members can read memberships" on public.team_members for select to authenticated using (public.is_team_member(team_id));
create policy "admins manage memberships" on public.team_members for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy "admins manage invitations" on public.team_invitations for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy "members read team watchlist" on public.team_watchlist_items for select to authenticated using (public.is_team_member(team_id));
create policy "analysts manage team watchlist" on public.team_watchlist_items for all to authenticated using (public.can_decide_for_team(team_id)) with check (public.can_decide_for_team(team_id));
create policy "members read team decisions" on public.team_decisions for select to authenticated using (public.is_team_member(team_id));
create policy "analysts manage team decisions" on public.team_decisions for insert to authenticated with check (public.can_decide_for_team(team_id) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "analysts update team decisions" on public.team_decisions for update to authenticated using (public.can_decide_for_team(team_id)) with check (public.can_decide_for_team(team_id) and updated_by = (select auth.uid()));
create policy "members read decision events" on public.team_decision_events for select to authenticated using (exists (select 1 from public.team_decisions d where d.id = decision_id and public.is_team_member(d.team_id)));
create policy "actors append decision events" on public.team_decision_events for insert to authenticated with check (actor_id = (select auth.uid()) and exists (select 1 from public.team_decisions d where d.id = decision_id and public.can_decide_for_team(d.team_id)));

revoke all on public.teams, public.team_members, public.team_invitations, public.team_watchlist_items, public.team_decisions, public.team_decision_events from anon;
grant select, insert, update, delete on public.teams, public.team_members, public.team_invitations, public.team_watchlist_items, public.team_decisions, public.team_decision_events to authenticated;
revoke all on function public.team_role(uuid), public.can_manage_team(uuid), public.can_decide_for_team(uuid) from public;
grant execute on function public.team_role(uuid), public.can_manage_team(uuid), public.can_decide_for_team(uuid) to authenticated;
