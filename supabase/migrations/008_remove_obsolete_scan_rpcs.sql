drop function if exists public.queue_deep_scan(text,text,text,text,text,text,text,text,text,boolean,bigint,numeric);
drop function if exists public.fail_scan_dispatch(uuid,text,text);
revoke execute on function public.is_team_member(uuid) from authenticated;
create index if not exists scan_jobs_requested_by on public.scan_jobs(requested_by,created_at desc);
create index if not exists watchlists_owner on public.watchlists(owner_id,created_at);
create index if not exists watchlist_items_extension on public.watchlist_items(extension_id);
create index if not exists extension_versions_latest_scan on public.extension_versions(latest_scan_id);
create index if not exists product_events_user on public.product_events(user_id);
create index if not exists design_partner_leads_user on public.design_partner_leads(user_id);
