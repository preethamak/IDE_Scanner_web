revoke all on public.teams, public.team_members, public.team_invitations,
  public.team_watchlist_items, public.finding_triage, public.finding_comments from authenticated;
revoke execute on function public.create_team(text) from authenticated;
