-- Trigger functions execute through their owning triggers and are not public
-- RPC endpoints. Remove the default function EXECUTE grant from API roles.
revoke execute on function public.create_scan_monitoring_alert() from public, anon, authenticated;
revoke execute on function public.initialize_monitoring_preferences() from public, anon, authenticated;
revoke execute on function public.queue_notification_delivery() from public, anon, authenticated;
revoke execute on function public.seed_channel_deliveries() from public, anon, authenticated;

-- This immutable helper has no relation lookup; constrain name resolution to
-- built-in operators and types.
alter function public.severity_meets_threshold(text, text)
  set search_path = pg_catalog;
