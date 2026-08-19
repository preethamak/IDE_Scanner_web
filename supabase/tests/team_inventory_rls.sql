-- Run against a disposable database after all migrations. The transaction
-- proves tenant isolation and role boundaries, then rolls back its fixtures.
begin;

insert into auth.users(id) values
  ('51515151-5151-4151-8151-515151515151'),
  ('52525252-5252-4252-8252-525252525252'),
  ('53535353-5353-4353-8353-535353535353');

insert into public.teams(id, name, slug, created_by) values
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'Inventory one', 'inventory-one', '51515151-5151-4151-8151-515151515151'),
  ('b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', 'Inventory two', 'inventory-two', '52525252-5252-4252-8252-525252525252');

insert into public.team_members(team_id, user_id, role) values
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', '51515151-5151-4151-8151-515151515151', 'analyst'),
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', '53535353-5353-4353-8353-535353535353', 'viewer'),
  ('b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', '52525252-5252-4252-8252-525252525252', 'owner');

do $$
declare
  snapshot_device uuid;
begin
  perform public.replace_team_inventory_snapshot(
    'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
    '51515151-5151-4151-8151-515151515151',
    'transaction-test', 'Transaction test', 'linux', 'json', now(),
    '[{"extension_id":"GitHub.copilot","version":"1.0.0","registry":"vs-marketplace"},{"extension_id":"redhat.java","version":"2.0.0","registry":"openvsx"}]'::jsonb
  );
  select id into snapshot_device from public.team_inventory_devices where external_id = 'transaction-test';
  perform public.replace_team_inventory_snapshot(
    'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
    '51515151-5151-4151-8151-515151515151',
    'transaction-test', 'Renamed transaction test', 'linux', 'json', now(),
    '[{"extension_id":"GitHub.copilot","version":"1.1.0","registry":"vs-marketplace"}]'::jsonb
  );
  if (select count(*) from public.team_inventory_installations where device_id = snapshot_device) <> 1 then
    raise exception 'snapshot replacement retained stale installations';
  end if;
  if not exists (
    select 1 from public.team_inventory_installations
    where device_id = snapshot_device and extension_id = 'GitHub.copilot' and version = '1.1.0'
  ) then raise exception 'snapshot replacement did not persist the current exact version'; end if;
  delete from public.team_inventory_devices where id = snapshot_device;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '51515151-5151-4151-8151-515151515151';

insert into public.team_inventory_devices(id, team_id, external_id, display_name, platform, source, created_by)
values ('d1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1', 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'engineering-laptop', 'Engineering laptop', 'linux', 'json', '51515151-5151-4151-8151-515151515151');
insert into public.team_inventory_imports(id, team_id, device_id, source, reported_at, extension_count, created_by)
values ('e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1', 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1', 'json', now(), 1, '51515151-5151-4151-8151-515151515151');
insert into public.team_inventory_installations(team_id, device_id, extension_id, version, registry, import_id, reported_at, created_by)
values ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1', 'GitHub.copilot', '1.0.0', 'vs-marketplace', 'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1', now(), '51515151-5151-4151-8151-515151515151');

do $$
begin
  if (select count(*) from public.team_inventory_devices) <> 1 then
    raise exception 'analyst cannot read its team inventory device';
  end if;
  begin
    insert into public.team_inventory_devices(team_id, external_id, display_name, platform, source, created_by)
    values ('b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', 'escape', 'Other team device', 'linux', 'json', '51515151-5151-4151-8151-515151515151');
    raise exception 'analyst can write inventory into another team';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claim.sub = '53535353-5353-4353-8353-535353535353';
do $$
begin
  if (select count(*) from public.team_inventory_installations) <> 1 then
    raise exception 'viewer cannot read its team inventory';
  end if;
  delete from public.team_inventory_installations
  where device_id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1';
  if not exists (
    select 1 from public.team_inventory_installations
    where device_id = 'd1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1'
  ) then raise exception 'viewer can mutate team inventory'; end if;
end;
$$;

set local request.jwt.claim.sub = '52525252-5252-4252-8252-525252525252';
do $$
begin
  if exists (select 1 from public.team_inventory_devices) then
    raise exception 'member can read another team inventory';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.team_inventory_devices;
    raise exception 'anonymous session can read team inventory';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
