alter table public.team_notification_channels
  drop constraint if exists team_notification_channels_kind_check;

alter table public.team_notification_channels
  add constraint team_notification_channels_kind_check
  check (kind in ('slack_webhook', 'generic_webhook', 'jira_cloud'));
