create table if not exists public.newsletter_subscribers(
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

create or replace function public.subscribe_newsletter(p_email text,p_source text,p_requester_hash text) returns uuid language plpgsql security definer set search_path=public as $$ declare subscriber_id uuid; recent_count integer; begin if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid email is required'; end if; select count(*) into recent_count from public.product_events where anonymous_id=p_requester_hash and name='newsletter_subscribed' and created_at>now()-interval '1 day'; if recent_count>=5 then raise exception 'Subscription limit reached'; end if; insert into public.newsletter_subscribers(email,source) values(left(lower(trim(p_email)),254),left(coalesce(nullif(trim(p_source),''),'footer'),40)) on conflict(email) do update set source=excluded.source returning id into subscriber_id; insert into public.product_events(anonymous_id,name,properties) values(p_requester_hash,'newsletter_subscribed',jsonb_build_object('subscriber_id',subscriber_id,'source',p_source)); return subscriber_id; end $$;
revoke all on function public.subscribe_newsletter(text,text,text) from public;
grant execute on function public.subscribe_newsletter(text,text,text) to anon,authenticated;
