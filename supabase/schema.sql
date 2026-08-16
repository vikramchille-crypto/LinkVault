-- LinkVault database schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
--
-- NOTE: if you already ran an older version of this file, do NOT re-run
-- this file — instead run, in order:
--   1. supabase/migration_user_categories.sql (if categories used to be one
--      fixed global table)
--   2. supabase/migration_user_sources.sql (if you don't yet have a
--      `sources` table / links.source was still free text)
-- Both are safe to run once and upgrade your existing data in place.

-- 1. Extension needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- 2. Categories table — each row belongs to one user, who can add, rename,
--    and delete their own categories from the Manage Categories screen.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  emoji text not null,
  sort_order int not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

drop policy if exists "Users can view their own categories" on public.categories;
create policy "Users can view their own categories"
  on public.categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own categories" on public.categories;
create policy "Users can insert their own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own categories" on public.categories;
create policy "Users can update their own categories"
  on public.categories for update
  using (auth.uid() = user_id and is_system = false)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own categories" on public.categories;
create policy "Users can delete their own categories"
  on public.categories for delete
  using (auth.uid() = user_id and is_system = false);

-- Note: the app seeds each new user's default categories (Business, Health,
-- Devotional, AI & Tech, Terrarium, Social Media, Finance, Learning, and a
-- protected "Uncategorized" fallback) automatically on first sign-in — see
-- src/hooks/useCategories.ts. Nothing to do here manually.

-- 3. Sources table — the root-level grouping for links (YouTube, Facebook,
--    Instagram, Website, or whatever you rename/add). Same ownership and
--    RLS pattern as categories.
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

-- Note: the app seeds each new user's default categories (Business, Health,
-- Devotional, AI & Tech, Terrarium, Social Media, Finance, Learning, and a
-- protected "Uncategorized" fallback) and default sources (YouTube,
-- Facebook, Instagram, and a protected "Website" fallback) automatically on
-- first sign-in — see src/hooks/useCategories.ts and src/hooks/useSources.ts.
-- Nothing to do here manually.

-- 4. Links table — the core of the app. One row per saved link.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text not null,
  description text,
  notes text,
  thumbnail_url text,
  source text not null default 'website',
  category text not null,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  is_important boolean not null default false,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  view_count int not null default 0,
  last_opened_at timestamptz,
  link_status text not null default 'unknown' check (link_status in ('active', 'unknown', 'broken')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A link's category and source must belong to that same user's own lists.
alter table public.links drop constraint if exists links_category_fkey;
alter table public.links
  add constraint links_category_fkey
  foreign key (user_id, category)
  references public.categories (user_id, key);

alter table public.links drop constraint if exists links_source_fkey;
alter table public.links
  add constraint links_source_fkey
  foreign key (user_id, source)
  references public.sources (user_id, key);

create index if not exists links_user_id_idx on public.links (user_id);
create index if not exists links_category_idx on public.links (category);
create index if not exists links_source_idx on public.links (source);
create index if not exists links_created_at_idx on public.links (created_at desc);
create index if not exists links_last_opened_at_idx on public.links (last_opened_at desc);
create index if not exists links_link_status_idx on public.links (link_status);
create index if not exists links_tags_idx on public.links using gin (tags);

-- Keep updated_at current automatically on every update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_links_updated_at on public.links;
create trigger set_links_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- 5. Row Level Security — every user can only see and modify their own links.
alter table public.links enable row level security;

drop policy if exists "Users can view their own links" on public.links;
create policy "Users can view their own links"
  on public.links for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own links" on public.links;
create policy "Users can insert their own links"
  on public.links for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own links" on public.links;
create policy "Users can update their own links"
  on public.links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own links" on public.links;
create policy "Users can delete their own links"
  on public.links for delete
  using (auth.uid() = user_id);
