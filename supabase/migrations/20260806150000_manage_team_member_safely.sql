-- Membership changes are serialized on the workspace row so two concurrent
-- requests cannot both remove or demote what each believes is the final owner.
create or replace function public.manage_team_member(
  target_team uuid,
  actor uuid,
  subject uuid,
  desired_role text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  subject_role text;
  owner_count integer;
begin
  perform 1 from public.teams where id = target_team for update;
  if not found then raise exception 'The selected workspace no longer exists.'; end if;

  select role into actor_role from public.team_members where team_id = target_team and user_id = actor;
  select role into subject_role from public.team_members where team_id = target_team and user_id = subject;
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'You no longer have permission to manage workspace members.';
  end if;
  if subject_role is null then
    raise exception 'The selected member no longer belongs to this workspace.';
  end if;
  if desired_role is not null and desired_role not in ('owner', 'admin', 'analyst', 'viewer') then
    raise exception 'Choose a valid workspace role.';
  end if;
  if actor_role = 'admin' and (subject_role in ('owner', 'admin') or desired_role in ('owner', 'admin')) then
    raise exception 'Administrators cannot manage owners or other administrators.';
  end if;

  if subject_role = 'owner' and desired_role is distinct from 'owner' then
    select count(*) into owner_count from public.team_members where team_id = target_team and role = 'owner';
    if owner_count <= 1 then
      raise exception 'The final workspace owner cannot be removed or demoted.';
    end if;
  end if;

  if desired_role is null then
    delete from public.team_members where team_id = target_team and user_id = subject;
    return jsonb_build_object('user_id', subject, 'removed', true, 'previous_role', subject_role);
  end if;

  update public.team_members set role = desired_role where team_id = target_team and user_id = subject;
  return jsonb_build_object('user_id', subject, 'role', desired_role, 'previous_role', subject_role);
end;
$$;

revoke all on function public.manage_team_member(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.manage_team_member(uuid, uuid, uuid, text) to service_role;
