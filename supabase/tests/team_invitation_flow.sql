-- Run with the postgres connection. This exercises the database half of the
-- two-person invite journey and rolls every fixture back.
begin;

insert into auth.users(id) values
  ('55555555-5555-4555-8555-555555555555'),
  ('66666666-6666-4666-8666-666666666666');

insert into public.teams(id, name, slug, created_by) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Invite flow team', 'invite-flow-team', '55555555-5555-4555-8555-555555555555');

insert into public.team_members(team_id, user_id, role) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '55555555-5555-4555-8555-555555555555', 'owner');

insert into public.team_invitations(id, team_id, token_hash, role, expires_at, created_by) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc01', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('a', 64), 'analyst', now() + interval '7 days', '55555555-5555-4555-8555-555555555555'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('b', 64), 'viewer', now() - interval '1 minute', '55555555-5555-4555-8555-555555555555');

do $$
declare accepted record;
begin
  select * into accepted from public.accept_team_invitation(repeat('a', 64), '66666666-6666-4666-8666-666666666666');
  if accepted.team_id <> 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid or accepted.role <> 'analyst' then
    raise exception 'invite returned the wrong team or role';
  end if;
  if not exists (
    select 1 from public.team_members
    where team_id = accepted.team_id and user_id = '66666666-6666-4666-8666-666666666666' and role = 'analyst'
  ) then
    raise exception 'accepted invite did not create the analyst membership';
  end if;
  if not exists (
    select 1 from public.team_invitations
    where token_hash = repeat('a', 64) and accepted_at is not null and accepted_by = '66666666-6666-4666-8666-666666666666'
  ) then
    raise exception 'accepted invite did not retain acceptance audit data';
  end if;
  begin
    perform * from public.accept_team_invitation(repeat('a', 64), '66666666-6666-4666-8666-666666666666');
    raise exception 'an invitation was accepted twice';
  exception when others then
    if position('already been accepted' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    perform * from public.accept_team_invitation(repeat('b', 64), '66666666-6666-4666-8666-666666666666');
    raise exception 'an expired invitation was accepted';
  exception when others then
    if position('Invitation has expired' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

rollback;
