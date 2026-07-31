-- Run against a non-production clone or inside a transaction with a postgres
-- connection. The fixture rolls back every row it creates.
begin;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into public.teams(id, name, slug, created_by) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RLS team one', 'rls-team-one', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RLS team two', 'rls-team-two', '22222222-2222-4222-8222-222222222222');

insert into public.team_members(team_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'viewer'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
begin
  if (select count(*) from public.teams) <> 1 then
    raise exception 'viewer can see a team outside its membership';
  end if;
  if (select count(*) from public.team_members) <> 1 then
    raise exception 'viewer can see memberships outside its team';
  end if;
  if exists (select 1 from public.teams where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then
    raise exception 'viewer can read the other team';
  end if;
end;
$$;

reset role;
rollback;
