-- Team inventory stores the latest reported extension set for a stable device
-- plus immutable import receipts. Raw host paths, usernames, and machine
-- identifiers are intentionally outside this contract.
create table public.team_inventory_devices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 160),
  display_name text not null check (char_length(display_name) between 1 and 120),
  platform text not null check (platform in ('linux', 'macos', 'windows', 'other')),
  source text not null check (source in ('cli', 'json', 'api')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  unique (team_id, external_id),
  unique (id, team_id)
);

create table public.team_inventory_imports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  device_id uuid not null,
  source text not null check (source in ('cli', 'json', 'api')),
  reported_at timestamptz not null,
  extension_count integer not null check (extension_count between 0 and 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, team_id),
  foreign key (device_id, team_id)
    references public.team_inventory_devices(id, team_id) on delete cascade
);

create table public.team_inventory_installations (
  team_id uuid not null references public.teams(id) on delete cascade,
  device_id uuid not null,
  extension_id text not null check (
    char_length(extension_id) between 3 and 255
    and extension_id ~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$'
  ),
  version text not null check (char_length(version) between 1 and 120),
  registry text not null default 'unknown' check (registry in ('vs-marketplace', 'openvsx', 'unknown')),
  import_id uuid not null,
  reported_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, extension_id),
  foreign key (device_id, team_id)
    references public.team_inventory_devices(id, team_id) on delete cascade,
  foreign key (import_id, team_id)
    references public.team_inventory_imports(id, team_id) on delete cascade
);

create index team_inventory_devices_team_seen_idx
  on public.team_inventory_devices(team_id, last_seen_at desc, id);
create index team_inventory_imports_team_created_idx
  on public.team_inventory_imports(team_id, created_at desc, id);
create index team_inventory_imports_device_idx
  on public.team_inventory_imports(device_id, created_at desc);
create index team_inventory_installations_team_extension_idx
  on public.team_inventory_installations(team_id, extension_id, version);
create index team_inventory_installations_import_idx
  on public.team_inventory_installations(import_id);
create unique index team_inventory_installations_device_extension_ci_idx
  on public.team_inventory_installations(device_id, lower(extension_id));

alter table public.team_inventory_devices enable row level security;
alter table public.team_inventory_imports enable row level security;
alter table public.team_inventory_installations enable row level security;

create policy "members read inventory devices"
  on public.team_inventory_devices for select to authenticated
  using (private.is_team_member(team_id));
create policy "analysts add inventory devices"
  on public.team_inventory_devices for insert to authenticated
  with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()));
create policy "analysts update inventory devices"
  on public.team_inventory_devices for update to authenticated
  using (private.can_decide_for_team(team_id))
  with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()));

create policy "members read inventory imports"
  on public.team_inventory_imports for select to authenticated
  using (private.is_team_member(team_id));
create policy "analysts add inventory imports"
  on public.team_inventory_imports for insert to authenticated
  with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()));

create policy "members read inventory installations"
  on public.team_inventory_installations for select to authenticated
  using (private.is_team_member(team_id));
create policy "analysts add inventory installations"
  on public.team_inventory_installations for insert to authenticated
  with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()));
create policy "analysts update inventory installations"
  on public.team_inventory_installations for update to authenticated
  using (private.can_decide_for_team(team_id))
  with check (private.can_decide_for_team(team_id) and created_by = (select auth.uid()));
create policy "analysts remove inventory installations"
  on public.team_inventory_installations for delete to authenticated
  using (private.can_decide_for_team(team_id));

revoke all on table public.team_inventory_devices,
  public.team_inventory_imports,
  public.team_inventory_installations from anon, authenticated;
grant select on table public.team_inventory_devices,
  public.team_inventory_imports,
  public.team_inventory_installations to authenticated;
grant insert, update on table public.team_inventory_devices to authenticated;
grant insert on table public.team_inventory_imports to authenticated;
grant insert, update, delete on table public.team_inventory_installations to authenticated;

-- One server-only transaction replaces the current snapshot. The API checks
-- membership before calling this function; direct browser execution is denied.
create or replace function public.replace_team_inventory_snapshot(
  target_team uuid,
  actor uuid,
  device_external_id text,
  device_display_name text,
  device_platform text,
  import_source text,
  observed_at timestamptz,
  extensions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_device uuid;
  target_import uuid;
  imported_count integer;
begin
  if jsonb_typeof(extensions) <> 'array' then
    raise exception 'extensions must be an array';
  end if;
  imported_count := jsonb_array_length(extensions);
  if imported_count > 1000 then
    raise exception 'inventory imports are limited to 1000 extensions';
  end if;

  insert into public.team_inventory_devices(
    team_id, external_id, display_name, platform, source, last_seen_at, created_by
  ) values (
    target_team, device_external_id, device_display_name, device_platform, import_source, observed_at, actor
  )
  on conflict (team_id, external_id) do update set
    display_name = excluded.display_name,
    platform = excluded.platform,
    source = excluded.source,
    last_seen_at = greatest(public.team_inventory_devices.last_seen_at, excluded.last_seen_at)
  returning id into target_device;

  insert into public.team_inventory_imports(
    team_id, device_id, source, reported_at, extension_count, created_by
  ) values (
    target_team, target_device, import_source, observed_at, imported_count, actor
  ) returning id into target_import;

  delete from public.team_inventory_installations where device_id = target_device;
  insert into public.team_inventory_installations(
    team_id, device_id, extension_id, version, registry, import_id, reported_at, created_by
  )
  select target_team, target_device, item.extension_id, item.version, item.registry,
    target_import, observed_at, actor
  from jsonb_to_recordset(extensions) as item(extension_id text, version text, registry text);

  return jsonb_build_object(
    'device_id', target_device,
    'import_id', target_import,
    'extension_count', imported_count
  );
end;
$$;

revoke all on function public.replace_team_inventory_snapshot(uuid, uuid, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_team_inventory_snapshot(uuid, uuid, text, text, text, text, timestamptz, jsonb)
  to service_role;
