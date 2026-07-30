alter table public.team_invitations
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;

create or replace function public.accept_team_invitation(
  p_token_hash text,
  p_user_id uuid
)
returns table(team_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.team_invitations%rowtype;
begin
  select * into invitation
  from public.team_invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'Invitation is invalid.';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'Invitation has already been accepted.';
  end if;
  if invitation.expires_at <= now() then
    raise exception 'Invitation has expired.';
  end if;

  insert into public.team_members(team_id, user_id, role)
  values (invitation.team_id, p_user_id, invitation.role)
  on conflict (team_id, user_id) do update set role = excluded.role;

  update public.team_invitations
  set accepted_at = now(), accepted_by = p_user_id
  where id = invitation.id;

  return query select invitation.team_id, invitation.role;
end;
$$;

revoke all on function public.accept_team_invitation(text, uuid) from public, anon, authenticated;
