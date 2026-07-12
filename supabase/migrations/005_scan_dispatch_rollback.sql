create or replace function public.fail_scan_dispatch(p_job_id uuid,p_requester_hash text,p_error text)
returns void language plpgsql security definer set search_path=public as $$
declare ext text; ver text;
begin
  update public.scan_jobs set status='failed',error=left(p_error,500),completed_at=now()
  where id=p_job_id and requester_hash=p_requester_hash and status='queued' and created_at>now()-interval '10 minutes'
  returning extension_id,version into ext,ver;
  if ext is not null then update public.extension_versions set scan_state='failed' where extension_id=ext and version=ver; end if;
end $$;
revoke all on function public.fail_scan_dispatch(uuid,text,text) from public;
grant execute on function public.fail_scan_dispatch(uuid,text,text) to anon,authenticated;
