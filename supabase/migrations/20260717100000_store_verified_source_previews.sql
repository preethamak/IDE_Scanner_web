-- Captured locally while scanning. These bounded snapshots remain available even
-- when a registry replaces the package for a previously reported version.
create table public.artifact_file_previews (
  scan_id uuid not null references public.scans(id) on delete cascade,
  path text not null,
  content text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length integer not null check (byte_length >= 0 and byte_length <= 204800),
  truncated boolean not null default false,
  primary key (scan_id, path)
);

alter table public.artifact_file_previews enable row level security;
grant select on public.artifact_file_previews to anon, authenticated;
create policy "public stored source previews" on public.artifact_file_previews for select to anon, authenticated using (true);
