-- LinkVault migration: user-managed categories
-- Run this in the Supabase SQL editor AFTER schema.sql if you already ran the
-- original schema. It converts categories from a fixed global list into rows
-- each user can add, rename, and delete themselves.
--
-- Safe to run once. Re-running is harmless (uses IF EXISTS / ON CONFLICT).

-- 1. Drop the old foreign key from links -> categories(key), since categories
--    will no longer have a single global "key" primary key.
alter table public.links drop constraint if exists links_category_fkey;

-- 2. Keep the old global rows around under a new name, just in case, then
--    build the new per-user table.
alter table if exists public.categories rename to categories_legacy;

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

-- 3. Give every existing user their own copy of the categories that used to
--    be global, so links pointing at e.g. "business" keep working. Also give
--    everyone a protected "Uncategorized" fallback used when a category is
--    deleted while links still use it.
insert into public.categories (user_id, key, label, emoji, sort_order, is_system)
select u.id, c.key, c.label, c.emoji, c.sort_order, false
from auth.users u
cross join public.categories_legacy c
on conflict (user_id, key) do nothing;

insert into public.categories (user_id, key, label, emoji, sort_order, is_system)
select u.id, 'uncategorized', 'Uncategorized', '📁', 999, true
from auth.users u
on conflict (user_id, key) do nothing;

-- 4. Re-point any links that don't have a matching category row (edge case)
--    to "uncategorized" so the new foreign key below doesn't fail.
update public.links l
set category = 'uncategorized'
where not exists (
  select 1 from public.categories c
  where c.user_id = l.user_id and c.key = l.category
);

-- 5. Re-add referential integrity: a link's category must belong to that
--    same user's category list.
alter table public.links
  add constraint links_category_fkey
  foreign key (user_id, category)
  references public.categories (user_id, key);

-- 6. Row Level Security: each user only sees/edits their own categories.
alter table public.categories enable row level security;

drop policy if exists "Categories are readable by everyone" on public.categories;

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
