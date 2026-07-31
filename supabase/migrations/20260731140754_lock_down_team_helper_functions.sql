-- These helpers are referenced by RLS policies only. They must not be callable
-- through PostgREST's public RPC surface, even by authenticated users.
revoke all on function public.team_role(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_team(uuid) from public, anon, authenticated;
revoke all on function public.can_decide_for_team(uuid) from public, anon, authenticated;
