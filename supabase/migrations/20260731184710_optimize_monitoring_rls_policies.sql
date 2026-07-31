-- Preserve the existing owner-only authorization while evaluating auth.uid()
-- once per query rather than once per candidate row.
drop policy if exists "own monitoring alerts" on public.monitoring_alerts;
create policy "own monitoring alerts" on public.monitoring_alerts
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "own monitoring preferences" on public.monitoring_preferences;
create policy "own monitoring preferences" on public.monitoring_preferences
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
