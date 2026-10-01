-- Preserve the artifact identity reported by endpoint inventory. Older clients
-- may omit it; those installations remain visible as version-only recall impact.
alter table public.team_inventory_installations
  add column if not exists artifact_sha256 text;

alter table public.team_monitoring_alerts
  drop constraint if exists team_monitoring_alerts_kind_check;
alter table public.team_monitoring_alerts
  add constraint team_monitoring_alerts_kind_check
  check (kind in ('release_detected', 'scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed', 'decision_due', 'artifact_recalled'));

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
security invoker
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
    team_id, device_id, extension_id, version, registry, artifact_sha256, import_id, reported_at, created_by
  )
  select target_team, target_device, item.extension_id, item.version, item.registry, item.artifact_sha256,
    target_import, observed_at, actor
  from jsonb_to_recordset(extensions) as item(extension_id text, version text, registry text, artifact_sha256 text);

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
