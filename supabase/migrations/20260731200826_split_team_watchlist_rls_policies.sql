-- Keep the member read policy separate from mutations. A FOR ALL policy also
-- applies to SELECT, which duplicates the membership policy and increases the
-- amount of RLS work on every watchlist read.
drop policy if exists "analysts manage team watchlist" on public.team_watchlist_items;

create policy "analysts add team watchlist items"
  on public.team_watchlist_items
  for insert
  to authenticated
  with check (private.can_decide_for_team(team_id));

create policy "analysts update team watchlist items"
  on public.team_watchlist_items
  for update
  to authenticated
  using (private.can_decide_for_team(team_id))
  with check (private.can_decide_for_team(team_id));

create policy "analysts remove team watchlist items"
  on public.team_watchlist_items
  for delete
  to authenticated
  using (private.can_decide_for_team(team_id));
