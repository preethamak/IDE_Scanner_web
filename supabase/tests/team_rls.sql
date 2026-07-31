-- Run against a non-production clone or inside a transaction with a postgres
-- connection. The fixture rolls back every row it creates.
begin;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333'),
  ('44444444-4444-4444-8444-444444444444');

insert into public.teams(id, name, slug, created_by) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RLS team one', 'rls-team-one', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RLS team two', 'rls-team-two', '22222222-2222-4222-8222-222222222222');

insert into public.team_members(team_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'viewer'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'analyst'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444444', 'admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner');

insert into public.team_notification_channels(id, team_id, kind, label, target_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'generic_webhook', 'Team one test relay', 'test-target-one'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'generic_webhook', 'Team two test relay', 'test-target-two');

insert into public.team_monitoring_alerts(id, team_id, extension_id, version, kind, severity, title, summary, dedupe_key)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', id, '1.0.0', 'review_required', 'HIGH', 'Team one alert', 'RLS test alert', 'team-one-rls-alert'
from public.extensions order by id limit 1;

insert into public.team_monitoring_alerts(id, team_id, extension_id, version, kind, severity, title, summary, dedupe_key)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', id, '1.0.0', 'review_required', 'HIGH', 'Team two alert', 'RLS test alert', 'team-two-rls-alert'
from public.extensions order by id limit 1;

do $$
begin
  begin
    insert into public.team_notification_deliveries(team_id, alert_id, channel_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01');
    raise exception 'duplicate alert delivery was accepted';
  exception when unique_violation then null;
  end;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
begin
  if (select count(*) from public.teams) <> 1 then
    raise exception 'viewer can see a team outside its membership';
  end if;
  if (select count(*) from public.team_members) <> 3 then
    raise exception 'viewer can see memberships outside its team';
  end if;
  if exists (select 1 from public.teams where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then
    raise exception 'viewer can read the other team';
  end if;
  if (select count(*) from public.team_monitoring_alerts) <> 1 then
    raise exception 'viewer can read alerts outside its team';
  end if;
  if (select count(*) from public.team_notification_deliveries) <> 1 then
    raise exception 'viewer can read deliveries outside its team';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.team_watchlist_items(team_id, extension_id, created_by)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'GitHub.copilot', '11111111-1111-4111-8111-111111111111');
    raise exception 'viewer can add a team watchlist item';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $$
begin
  insert into public.team_watchlist_items(team_id, extension_id, created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'GitHub.copilot', '33333333-3333-4333-8333-333333333333');
  if not exists (select 1 from public.team_watchlist_items where team_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and extension_id = 'GitHub.copilot') then
    raise exception 'analyst cannot add a watchlist item in its own team';
  end if;
  begin
    insert into public.team_watchlist_items(team_id, extension_id, created_by)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'GitHub.copilot', '33333333-3333-4333-8333-333333333333');
    raise exception 'analyst can add an item in another team';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$
begin
  insert into public.team_watchlist_items(team_id, extension_id, created_by)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'GitHub.copilot', '22222222-2222-4222-8222-222222222222');
  if not exists (select 1 from public.team_watchlist_items where team_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and extension_id = 'GitHub.copilot') then
    raise exception 'owner cannot add a watchlist item in its own team';
  end if;
end;
$$;

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
do $$
begin
  insert into public.team_watchlist_items(team_id, extension_id, created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dbaeumer.vscode-eslint', '44444444-4444-4444-8444-444444444444');
  if not exists (select 1 from public.team_watchlist_items where team_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and extension_id = 'dbaeumer.vscode-eslint') then
    raise exception 'admin cannot add a watchlist item in its own team';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.team_watchlist_items;
    raise exception 'anonymous session can read team watchlist items';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
