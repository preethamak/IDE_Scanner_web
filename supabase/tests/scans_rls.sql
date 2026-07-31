-- Run against a clone or production only as an inspection assertion. The
-- policy split is deliberate: anon can see published evidence, while the
-- combined authenticated policy also permits its requester-owned scan.
begin;

do $$
declare
  anonymous_policy_count integer;
  authenticated_policy_count integer;
begin
  select count(*) into anonymous_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'scans' and cmd = 'SELECT'
    and 'anon' = any(roles);
  if anonymous_policy_count <> 1 then
    raise exception 'expected one anonymous public scan policy, found %', anonymous_policy_count;
  end if;

  select count(*) into authenticated_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'scans' and cmd = 'SELECT'
    and 'authenticated' = any(roles);
  if authenticated_policy_count <> 1 then
    raise exception 'expected one authenticated scan policy, found %', authenticated_policy_count;
  end if;
end;
$$;

rollback;
