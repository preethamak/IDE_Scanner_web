-- API keys are capability tokens: each machine credential gets only the
-- operations its integration needs. Existing keys retain bulk-gate access.
alter table public.api_keys
  add column scopes text[] not null default array['gate:read']::text[];

alter table public.api_keys
  add constraint api_keys_scopes_nonempty check (cardinality(scopes) > 0),
  add constraint api_keys_scopes_known check (scopes <@ array['gate:read']::text[]);
