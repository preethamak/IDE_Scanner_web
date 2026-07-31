-- Team workspaces are the current authorization boundary. Preserve each
-- existing personal watchlist by giving it a same-owner team with the same
-- UUID, then copy the exact watched extension identities idempotently.
insert into public.teams(id, name, slug, created_by, created_at)
select
  w.id,
  left(coalesce(nullif(trim(w.name), ''), 'Personal workspace'), 80),
  left(trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(w.name), ''), 'personal-workspace')), '[^a-z0-9]+', '-', 'g')), 48)
    || '-' || left(w.id::text, 8),
  w.owner_id,
  w.created_at
from public.watchlists w
on conflict (id) do nothing;

insert into public.team_members(team_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.watchlists w
on conflict (team_id, user_id) do update set role = excluded.role;

insert into public.team_watchlist_items(team_id, extension_id, created_by, created_at)
select w.id, item.extension_id, w.owner_id, item.created_at
from public.watchlists w
join public.watchlist_items item on item.watchlist_id = w.id
on conflict (team_id, extension_id) do nothing;
