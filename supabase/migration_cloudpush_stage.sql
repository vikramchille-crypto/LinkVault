-- LinkVault migration: "Cloudpush" stage additions
-- Run this in the Supabase SQL editor. Safe to run once (uses IF NOT EXISTS).
--
-- Adds:
--   - links.notes           — personal notes, separate from the auto-fetched
--                              OG description, searchable from the search bar.
--   - links.last_opened_at  — set whenever you open a link through LinkVault,
--                              powers the "Recently Opened" section on the
--                              Recent page (separate from "Recently Added").

alter table public.links add column if not exists notes text;
alter table public.links add column if not exists last_opened_at timestamptz;

create index if not exists links_last_opened_at_idx on public.links (last_opened_at desc);
