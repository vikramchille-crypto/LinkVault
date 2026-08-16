-- LinkVault migration: user-managed sources (root-level grouping)
-- Run this in the Supabase SQL editor if you already ran schema.sql (or the
-- categories migration) before this feature existed. Safe to run once.
--
-- This adds a `sources` table — the same pattern as `categories` — so
-- "YouTube / Facebook / Instagram / Website" (or whatever you rename them
-- to) become the root-level grouping for your links, with Category nested
-- underneath each one.

-- 1. Create the sources table.
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  icon text not null default '🔗',
  sort_order int not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists sources_user_id_idx on public.sources (user_id);

alter table public.sources enable row level security;

drop policy if exists "Users can view their own sources" on public.sources;
create policy "Users can view their own sources"
  on public.sources for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sources" on public.sources;
create policy "Users can insert their own sources"
  on public.sources for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sources" on public.sources;
create policy "Users can update their own sources"
  on public.sources for update
  using (auth.uid() = user_id and is_system = false)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sources" on public.sources;
create policy "Users can delete their own sources"
  on public.sources for delete
  using (auth.uid() = user_id and is_system = false);

-- 2. Give every existing user the default source set: YouTube, Facebook,
--    Instagram, and a protected "Website" fallback for everything else.
insert into public.sources (user_id, key, label, icon, sort_order, is_system)
select u.id, v.key, v.label, v.icon, v.sort_order, v.is_system
from auth.users u
cross join (values
  ('youtube', 'YouTube', '▶️', 1, false),
  ('facebook', 'Facebook', '📘', 2, false),
  ('instagram', 'Instagram', '📸', 3, false),
  ('website', 'Website', '🌐', 999, true)
) as v(key, label, icon, sort_order, is_system)
on conflict (user_id, key) do nothing;

-- 3. Normalize existing links.source (which held free-text labels like
--    "YouTube", "Facebook", "example.com", "GitHub", etc.) into the new
--    lowercase keys. Anything that isn't clearly YouTube/Facebook/Instagram
--    becomes "website".
update public.links
set source = case
  when lower(source) like '%youtube%' or lower(source) like '%youtu.be%' then 'youtube'
  when lower(source) like '%facebook%' or lower(source) like '%fb.watch%' then 'facebook'
  when lower(source) like '%instagram%' then 'instagram'
  else 'website'
end;

-- 4. Referential integrity: a link's source must belong to that same user's
--    own source list — same pattern already used for category.
alter table public.links drop constraint if exists links_source_fkey;
alter table public.links
  add constraint links_source_fkey
  foreign key (user_id, source)
  references public.sources (user_id, key);
