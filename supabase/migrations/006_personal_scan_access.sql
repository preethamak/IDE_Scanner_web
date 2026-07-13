create policy "own scan jobs" on public.scan_jobs for select to authenticated using ((select auth.uid()) = requested_by);
grant select on public.scan_jobs to authenticated;
