create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  created_by uuid not null references auth.users(id),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_team_id_idx on public.api_keys (team_id);

alter table public.api_keys enable row level security;
create policy "members read team api key metadata" on public.api_keys
  for select to authenticated using (public.is_team_member(team_id));
grant select on public.api_keys to authenticated;
revoke insert, update, delete on public.api_keys from anon, authenticated;
-- Key creation, revocation, and the api_key_hash lookup used to authenticate
-- bulk requests are all service-role mediated: the API verifies team role
-- (create/revoke) or hashes+matches the presented key (auth) before ever
-- touching this table. The client-facing GET route selects an explicit
-- column list that omits key_hash, mirroring team_notification_channels'
-- treatment of target_encrypted.
