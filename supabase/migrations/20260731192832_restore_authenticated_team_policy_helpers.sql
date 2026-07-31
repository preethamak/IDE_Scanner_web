-- RLS evaluates these SECURITY DEFINER helpers as the requesting database
-- role. They remain unavailable to anon and PUBLIC, but authenticated users
-- need EXECUTE for the policies that call them.
grant execute on function public.team_role(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;
grant execute on function public.can_decide_for_team(uuid) to authenticated;
