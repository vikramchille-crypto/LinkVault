-- LinkVault migration: "STAGE2" additions
-- Run this in the Supabase SQL editor. Safe to run once (uses IF NOT EXISTS).
--
-- Adds link-health tracking columns. Nothing else needs schema changes this
-- stage — AI categorization, natural language search, and link-checking are
-- all Edge Functions that read/write existing columns.

alter table public.links add column if not exists link_status text not null default 'unknown'
  check (link_status in ('active', 'unknown', 'broken'));
alter table public.links add column if not exists last_checked_at timestamptz;

create index if not exists links_link_status_idx on public.links (link_status);
