-- Explicit API grants and tightly scoped authenticated workflows.
grant usage on schema public to anon, authenticated;

grant select on public.extensions, public.extension_versions, public.scans,
  public.findings, public.artifact_files, public.dependencies to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.watchlists, public.watchlist_items to authenticated;
grant select on public.teams, public.team_members, public.team_invitations,
  public.team_watchlist_items, public.finding_triage, public.finding_comments to authenticated;
grant insert, update, delete on public.team_watchlist_items, public.finding_triage,
  public.finding_comments to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

create or replace function public.create_team(team_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  created public.teams;
  normalized text := left(trim(team_name), 80);
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if normalized = '' then raise exception 'Team name is required'; end if;
  insert into public.teams(name, slug, created_by)
  values (normalized, trim(both '-' from regexp_replace(lower(normalized), '[^a-z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6), actor)
  returning * into created;
  insert into public.team_members(team_id, user_id, role) values(created.id, actor, 'owner');
  return created;
end;
$$;
revoke all on function public.create_team(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;

alter table public.extensions
  add column if not exists license text,
  add column if not exists maintainers jsonb not null default '[]'::jsonb,
  add column if not exists repository_metadata jsonb not null default '{}'::jsonb,
  add column if not exists registry_metadata jsonb not null default '{}'::jsonb;

create index if not exists scans_diagnostics on public.scans(decision, risk_score desc, malware_score desc);
