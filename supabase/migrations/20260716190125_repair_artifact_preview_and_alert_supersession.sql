-- A report can only preview source when it can re-fetch the exact registry
-- artifact and verify it against the scan's recorded SHA-256.
update public.extension_versions v
set download_url = case
  when v.registry = 'vs-marketplace' then
    'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/' || replace(e.publisher, ' ', '%20') ||
    '/vsextensions/' || replace(e.name, ' ', '%20') || '/' || replace(v.version, ' ', '%20') || '/vspackage'
  when v.registry = 'openvsx' then
    'https://open-vsx.org/api/' || replace(e.publisher, ' ', '%20') || '/' || replace(e.name, ' ', '%20') || '/' ||
    replace(v.version, ' ', '%20') || '/file/' || replace(e.publisher, ' ', '%20') || '.' || replace(e.name, ' ', '%20') || '-' ||
    replace(v.version, ' ', '%20') || '.vsix'
  else v.download_url
end
from public.extensions e
where e.id = v.extension_id and coalesce(v.download_url, '') = '';

-- Only the newest scan alert for one exact release is actionable. Older
-- results remain auditable but leave the active queue after a rescan.
with ranked as (
  select id, row_number() over (
    partition by owner_id, extension_id, version
    order by created_at desc, id desc
  ) as position
  from public.monitoring_alerts
  where kind in ('scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed')
    and state in ('unread', 'read', 'acknowledged')
)
update public.monitoring_alerts a
set state = 'dismissed', resolved_at = coalesce(a.resolved_at, now()),
    metadata = a.metadata || jsonb_build_object('superseded', true)
from ranked r
where a.id = r.id and r.position > 1;

create or replace function public.create_scan_monitoring_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watcher record;
  alert_kind text;
  alert_title text;
  alert_summary text;
begin
  if new.scan_purpose not in ('public_intelligence', 'user_request') then return new; end if;

  if new.decision = 'block' then
    alert_kind := 'confirmed_threat';
    alert_title := 'Confirmed threat evidence blocked ' || new.extension_id || '@' || new.version;
    alert_summary := 'The completed scan produced a block decision. Open the exact artifact report before taking remediation action.';
  elsif new.decision = 'incomplete' then
    alert_kind := 'coverage_incomplete';
    alert_title := 'Coverage incomplete for ' || new.extension_id || '@' || new.version;
    alert_summary := 'The scanner could not complete required analysis. This is not a clean result.';
  elsif new.severity in ('CRITICAL', 'HIGH') then
    alert_kind := 'review_required';
    alert_title := new.severity || '-severity evidence needs review: ' || new.extension_id || '@' || new.version;
    alert_summary := 'The completed scan requires human context. This is review evidence, not a public vulnerability claim.';
  else
    alert_kind := 'scan_completed';
    alert_title := 'New scan completed for ' || new.extension_id || '@' || new.version;
    alert_summary := 'Review the exact artifact evidence and operational decision.';
  end if;

  for watcher in
    select distinct w.owner_id
    from public.watchlist_items i
    join public.watchlists w on w.id = i.watchlist_id
    join public.monitoring_preferences p on p.owner_id = w.owner_id
    where i.extension_id = new.extension_id
      and p.in_app_enabled = true
      and p.scan_alerts = true
  loop
    update public.monitoring_alerts
    set state = 'dismissed', resolved_at = coalesce(resolved_at, now()),
        metadata = metadata || jsonb_build_object('superseded', true, 'superseded_by_scan_id', new.id)
    where owner_id = watcher.owner_id
      and extension_id = new.extension_id
      and version = new.version
      and kind in ('scan_completed', 'review_required', 'confirmed_threat', 'coverage_incomplete', 'scan_failed')
      and state in ('unread', 'read', 'acknowledged');

    insert into public.monitoring_alerts(owner_id, extension_id, version, scan_id, kind, severity, title, summary, metadata, dedupe_key)
    values (
      watcher.owner_id, new.extension_id, new.version, new.id, alert_kind, new.severity, alert_title, alert_summary,
      jsonb_build_object('decision', new.decision, 'coverage_percent', new.coverage_percent, 'scan_purpose', new.scan_purpose),
      'scan:' || new.id::text
    ) on conflict (owner_id, dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
