# LinkVault

**Your Personal Reference Library** — a visual link/bookmark organizer built with React, TypeScript, Tailwind CSS, and Supabase.

## Architecture

```
linkvault/
├── src/
│   ├── components/
│   │   ├── layout/        Sidebar, TopBar (debounced + NL search), AppLayout
│   │   │                  (shared link state, mobile FAB, Android Share handling),
│   │   │                  NaturalLanguageSearch
│   │   ├── links/         LinkCard, CardMenu (portal-based dropdown), LinkGrid,
│   │   │                  AddLinkModal (metadata + AI suggestions + duplicate
│   │   │                  detection), toolbar, SimpleLinksPage
│   │   ├── dashboard/      StatsCards, SourceTiles, CategoryTiles, PopularTags
│   │   └── common/         EmptyState, Loading, ErrorState
│   ├── pages/               Dashboard, AllLinks, Favorites, Recent, Important, Archive, Trash,
│   │                        ManageCategories, ManageSources, ManageTags, DataTools (import/export),
│   │                        LinkHealth, Analytics, Login
│   ├── hooks/               useLinks (CRUD + duplicate detection + tag rename/delete + bulk
│   │                        insert + link-health check), useLinkActions, usePersistedViewMode
│   ├── contexts/            AuthContext, CategoriesContext, SourcesContext, ThemeContext
│   ├── lib/supabase.ts      Supabase client (reads env vars only — no hard-coded keys)
│   ├── utils/                category/source metadata, URL normalization, CSV/bookmark
│   │                         parsing, link-preview + AI-suggestion + link-check clients, filtering/sorting
│   └── types/                shared TypeScript types
├── supabase/
│   ├── schema.sql            full schema for a brand-new project
│   ├── config.toml           requires a valid JWT on every Edge Function
│   ├── migration_*.sql       incremental upgrades for existing projects (see below)
│   └── functions/            link-preview, ai-categorize, nl-search, check-link
├── extension/                 separate browser extension project — see extension/README.md
└── .env.example               copy to .env.local and fill in your project's keys
```

**Data flow:** `AppLayout` creates a single `useLinks()` instance and passes it down to whichever page is routed, so every page/action (favorite, archive, delete, add) reads and writes the same in-memory list without duplicate fetches. All filtering, sorting, and searching happens client-side over that list — fine at the "hundreds of links" scale described in the brief. `useLinkActions` wraps the raw mutators with the "open in new tab + count a view" and "open edit modal" behaviors so every page wires actions identically.

**Security:** Supabase Row Level Security policies restrict every `select`/`insert`/`update`/`delete` on `links` to rows where `user_id = auth.uid()`, so even though the anon key ships in the frontend bundle, users can only ever see and modify their own data.

## What's implemented vs. what needs an external service

Automatic link previews are implemented via a **Supabase Edge Function** (`supabase/functions/link-preview`), not a third-party API — it fetches the target page server-side and parses its Open Graph tags (or YouTube's public oEmbed data for YouTube links), so no API key of any kind is needed anywhere, including in the frontend bundle. It fires automatically about a second after you stop typing a URL, only filling in fields you haven't already typed something into, and there's a "Fetch preview" / "Refetch preview" button to trigger it manually or force-refresh it. If a preview can't be found (private page, the site blocks scraping, etc.), you can still type the title and paste a thumbnail image URL manually — nothing is blocked on this working. **This function needs a one-time deploy** — see "Supabase setup" below.

## Stage: "Cloudpush" — what was added

This pass turned the basic dashboard into a fuller link organizer, on top of everything already there (Sources/Categories hierarchy, auth, CRUD, dark theme):

- **Server-side link metadata** — replaced the earlier client-side third-party preview API with a Supabase Edge Function (see above), which is both more secure (no key to leak) and more capable (works around CORS for sites like Facebook/Instagram that block direct browser fetches).
- **Duplicate detection** — pasting a URL that's already saved shows "This link is already in your library" with **Open Existing / Save Anyway / Cancel**, instead of silently creating a second copy.
- **Notes field** — separate from the auto-fetched Description; your own personal notes ("Good idea for my business"), searchable from the top search bar.
- **Richer link cards** — now show a short description, up to 3 tags, a view count, and an important-link flag badge. Hovering a card reveals quick actions (Open / Edit / Favorite / Archive) without opening the three-dot menu.
- **Recent page** now has two sections: **Recently Added** (by save date) and **Recently Opened** (by the last time you actually opened it through LinkVault — tracked via a new `last_opened_at` column).
- **Manage Tags page** (`/tags`, linked from the sidebar) — rename a tag everywhere it's used, or delete it from every link, plus a full tag list with counts.
- **Expanded filtering** — All Links and every list page now filter by Source, Category, Tag, Favorite-only, Important-only, and (optionally) include Archived items; sorting adds **Alphabetical** alongside Newest/Oldest/Most Viewed.
- **Grid/List view is remembered** across visits (stored in your browser).
- **Dashboard** now shows Important and Total Views stats, plus dedicated Favorites and Most Viewed sections alongside Recently Added.
- **Mobile**: a floating "+" button is now always reachable on small screens (the sidebar's Add button is behind the hamburger menu there), and archived items get a direct "Delete permanently" option so you don't have to trash-then-delete.

## Stage: "STAGE2" — AI, PWA, browser extension, import/export, link health, analytics

Building on the "Cloudpush" stage (Sources/Categories hierarchy, metadata fetch, richer cards, etc.), this pass added:

- **AI auto-categorization** — an optional "Suggest" button in Add Link calls Claude (via a secure Edge Function) for a category + 3–6 tag suggestion, grounded in your actual existing categories/tags. You explicitly Accept or Reject — nothing is applied automatically, and saving a link never requires this.
- **Natural language search** — a sparkle icon in the top bar lets you type things like *"show my favorite marketing links"* or *"YouTube videos about terrarium lighting"*; it's translated into real filters and opens All Links with them applied. The normal keyword search box is completely separate and always works, AI configured or not.
- **PWA** — installable app with a real icon, standalone display, and an offline-capable app shell (the interface loads instantly with no network; your saved links still require one — see limitations). Configured via `vite-plugin-pwa` + `public/manifest.webmanifest`.
- **Android Share support** — share a link from any app (e.g. YouTube → Share → LinkVault) and it opens straight into a pre-filled Add Link form via the Web Share Target API.
- **A real, working browser extension** (`extension/` — separate project) — toolbar popup or right-click "Save to LinkVault" from any page, talking directly to your Supabase project. See `extension/README.md`.
- **Import** (`/data`) — from browser bookmark HTML exports, CSV, or LinkVault's own JSON export. Detects duplicates before importing and lets you assign categories per-row (bookmark folder names are auto-matched to your categories where possible).
- **Export** (`/data`) — full library to JSON or CSV, including notes, tags, favorite/important flags.
- **Link Health** (`/health`) — manually check whether saved links still resolve, one at a time or in a rate-limited batch. Never runs automatically.
- **Analytics** (`/analytics`) — total links, links added this month, most-used categories, most-viewed links, most-used tags.
- **Performance** — search input is now debounced (250ms), and All Links uses windowed "Load More" pagination instead of rendering everything at once.
- **Security review** — every Edge Function now requires a valid user JWT (`supabase/config.toml`); see `TECHNICAL_REPORT.md` §9 for the full review.

See **`TECHNICAL_REPORT.md`** for the complete architecture/schema/API/deployment writeup this stage's brief asked for.



```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase
cp .env.example .env.local
# then edit .env.local with your project's URL + anon key

# 3. Run the dev server
npm run dev
```

Then open http://localhost:5173.

To type-check and build for production:

```bash
npm run build
```

> This project was built in a sandboxed environment without internet access, so `npm install` / `tsc` / `vite build` could not be run here to verify a clean build. Please run `npm install` and `npm run build` locally as your first step — if TypeScript reports anything, paste the error back and it's a quick fix.

## Supabase setup (do this manually)

1. **Create a project** at [supabase.com](https://supabase.com) if you don't have one.
2. **Run the schema.**
   - **Brand-new Supabase project:** Open SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
   - **Already set up LinkVault before this stage?** Don't re-run `schema.sql` — instead run, in order (each is safe to run once):
     1. `supabase/migration_user_categories.sql` — only if `categories` used to be one fixed global table.
     2. `supabase/migration_user_sources.sql` — only if you don't yet have a `sources` table.
     3. `supabase/migration_cloudpush_stage.sql` — adds `notes` and `last_opened_at` columns to `links`.
     4. `supabase/migration_stage2.sql` — adds `link_status` and `last_checked_at` columns to `links`. **Needed by everyone upgrading to this stage.**
3. **Deploy all four Edge Functions**:
   ```bash
   # One-time: install the Supabase CLI if you don't have it
   npm install -g supabase

   # Log in and link this project to your Supabase project
   supabase login
   supabase link --project-ref your-project-ref   # find this in your project's URL/Settings

   # Deploy each function
   supabase functions deploy link-preview
   supabase functions deploy ai-categorize
   supabase functions deploy nl-search
   supabase functions deploy check-link
   ```
4. **Set your Anthropic API key as a secret** (needed for AI auto-categorization and natural language search only — everything else works without it):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
   Get a key at [console.anthropic.com](https://console.anthropic.com). If you skip this, the app still works fully — the "Suggest" AI button and the sparkle/NL-search icon will just show a clear error when clicked, and normal keyword search is unaffected.
5. **Enable email/password auth.** Project → Authentication → Providers → Email should already be on by default. Optionally turn off "Confirm email" while testing locally so sign-up doesn't require clicking a confirmation link.
6. **(Optional) Enable Google login.** Project → Authentication → Providers → Google → follow Supabase's prompt to add your Google OAuth client ID/secret from the Google Cloud Console, and add `http://localhost:5173` (and your production URL later) to the authorized redirect URIs.
7. **Grab your API keys.** Project → Settings → API → copy the "Project URL" and the "anon public" key into `.env.local` as shown in `.env.example`. Never put these in `schema.sql`, code, or commit them to git — they belong only in `.env.local`, which is already git-ignored.
8. **Sign up** in the running app with any email/password. Your default sources (YouTube, Facebook, Instagram, plus a protected "Website") and categories (Business, Health, Devotional, AI & Tech, Terrarium, Social Media, Finance, Learning, plus a protected "Uncategorized") are created automatically the first time you sign in — you're ready to start saving links.

## Environment variables

**Frontend** (`.env.local`, both required, covered in `.env.example`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Supabase Edge Function secret** (server-side only, set via `supabase secrets set`, never in `.env.local`):
- `ANTHROPIC_API_KEY` — required only for AI auto-categorization and natural language search. Everything else works without it.

## Browser extension

A separate, working browser extension lives in `extension/` (outside this `linkvault/` folder) — see `extension/README.md` for install and setup. It connects directly to the same Supabase project via its own Options page (same URL/anon key as above), no shared build step with the web app.

## How links are organized

Links are grouped two levels deep:

- **Source** (root level) — YouTube, Facebook, Instagram, Website, or any custom source you add. Every link belongs to exactly one source, and the Add Link form guesses it automatically from the pasted URL (you can always override it).
- **Category** (nested level) — Business, Health, etc. Filters within a source, or across all of them from All Links.

The sidebar's Sources section is expandable — click the arrow next to a source to see its categories nested underneath, each with its own link count.

## Managing categories and sources

- **Categories:** click the gear icon next to "Sources" → "Manage categories" in the nested list, or go to `/categories`, to add, rename, or delete a category. Deleting one moves any links that used it into "Uncategorized" first, so nothing is lost.
- **Sources:** click the gear icon next to "Sources" in the sidebar, or go to `/sources`, to add, rename, or delete a source. Deleting one moves any links that used it into "Website" first.

"Uncategorized" and "Website" are protected system defaults and can't be deleted, since they're the fallback everything lands in.

## Remaining limitations

- **Facebook/Instagram previews are inconsistent.** Both platforms serve limited HTML (or require login) to non-browser requests, so the Edge Function's Open Graph scraping sometimes can't find a title/image for them — you'll fall back to manual entry in those cases. YouTube and most ordinary websites work reliably.
- **Tag rename/delete does one write per affected link** (no dedicated tags table), which is fine at personal-library scale but would need a real join table if you ever had thousands of links sharing one tag.
- **AI suggestions require explicit accept** and are only as good as Claude's read of the title/URL/description — treat them as a starting point, not an authority.
- **PWA offline support covers the app shell only**, not your saved links data — by design, since pretending link data works offline when it doesn't would be misleading. You need a connection to actually browse/add links.
- **The browser extension is unpublished** (load-unpacked / developer-mode install only) and needs one-time Supabase URL/key setup per browser profile — see `extension/README.md`.
- **No automated test suite.** Everything was verified by careful manual code review and consistency checks (import resolution, type-checking by inspection) rather than an actual `npm run build`/`tsc` pass, since this sandbox has no network access to install dependencies. Please run `npm install && npm run build` locally — if anything surfaces, send it over.
- **Search is client-side** over already-loaded links (title, description, notes, category, source, tags) — fast at hundreds of links, but would need a server-side/indexed search if the library grew into the tens of thousands.

See `TECHNICAL_REPORT.md` for the full architecture/schema/API/security/performance writeup.

## Deploying (Vercel or similar)

1. Push this repo to GitHub (see below).
2. Import the repo into Vercel.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel's project settings — the same values from your `.env.local`.
5. If you enabled Google login, add your production domain to Supabase's allowed redirect URLs and to the Google OAuth client's authorized origins.

## Pushing this project to your GitHub

This was built in a sandboxed environment without GitHub access, so push it from your own machine:

```bash
cd linkvault
git init
git add .
git commit -m "Initial commit: LinkVault"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on GitHub first via github.com/new, without a README/gitignore, then use the URL it gives you in the `git remote add` step above.)
