create table if not exists public.feedback_submissions(
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('bug', 'suggestion', 'report_clarity', 'other')),
  message text not null check (char_length(message) between 1 and 4000),
  contact_email text,
  page_path text not null default '',
  requester_hash text not null,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  email_error text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;
revoke all on public.feedback_submissions from public, anon, authenticated;
grant all on public.feedback_submissions to service_role;

create index if not exists feedback_submissions_requester_created
  on public.feedback_submissions(requester_hash, created_at desc);

create or replace function public.submit_feedback(
  p_category text,
  p_message text,
  p_contact_email text default null,
  p_page_path text default '',
  p_requester_hash text default ''
) returns public.feedback_submissions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  feedback public.feedback_submissions;
  recent_count integer;
  normalized_message text := trim(coalesce(p_message, ''));
  normalized_email text := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  normalized_path text := left(trim(coalesce(p_page_path, '')), 500);
begin
  if p_category not in ('bug', 'suggestion', 'report_clarity', 'other') then
    raise exception 'Choose a valid feedback category.';
  end if;
  if normalized_message = '' then
    raise exception 'Tell us a little more so the team can act on your feedback.';
  end if;
  if char_length(normalized_message) > 4000 then
    raise exception 'Feedback is limited to 4000 characters.';
  end if;
  if normalized_email is not null and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid contact email or leave it blank.';
  end if;
  if char_length(coalesce(p_requester_hash, '')) < 16 then
    raise exception 'Feedback could not be verified.';
  end if;

  select count(*) into recent_count
  from public.feedback_submissions
  where requester_hash = p_requester_hash
    and created_at > now() - interval '1 hour';
  if recent_count >= 5 then
    raise exception 'Feedback limit reached. Please try again later.';
  end if;

  insert into public.feedback_submissions(
    category, message, contact_email, page_path, requester_hash
  ) values (
    p_category, normalized_message, left(normalized_email, 254), normalized_path, p_requester_hash
  ) returning * into feedback;
  return feedback;
end;
$$;

revoke all on function public.submit_feedback(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, text, text)
  to service_role;
