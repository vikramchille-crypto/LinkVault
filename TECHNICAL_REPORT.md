# LinkVault — Technical Report (STAGE2)

This report covers the application as of STAGE2 (AI features, natural language search, PWA, browser extension, import/export, link health, analytics, security/performance work). For setup instructions, see `README.md`; for the browser extension specifically, see `extension/README.md`.

## 1. Current architecture

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, React Router, Supabase (Postgres + Auth + Row Level Security + Edge Functions), Anthropic Claude API (server-side only).

**Client structure:**

```
src/
├── components/
│   ├── layout/     Sidebar, TopBar (debounced search + NL search entry point),
│   │                AppLayout (owns the single useLinks() instance, mobile FAB,
│   │                Android Share Target handling), NaturalLanguageSearch
│   ├── links/       LinkCard, CardMenu (portal-based dropdown, escapes card
│   │                overflow-hidden clipping), LinkGrid, AddLinkModal
│   │                (metadata fetch, AI suggestions, duplicate detection),
│   │                LinksToolbar, SimpleLinksPage (shared list-page shell)
│   ├── dashboard/   StatsCards, SourceTiles, CategoryTiles, PopularTags
│   └── common/      EmptyState, Loading, ErrorState
├── pages/           Dashboard, AllLinks, Favorites, Recent, Important, Archive,
│                    Trash, ManageCategories, ManageSources, ManageTags,
│                    DataTools (import/export), LinkHealth, Analytics, Login
├── hooks/           useLinks (all CRUD + duplicate detection + tag rename/
│                    delete + bulk insert + link-health check), useCategories,
│                    useSources, useLinkActions, usePersistedViewMode
├── contexts/        AuthContext, CategoriesContext, SourcesContext, ThemeContext
├── lib/supabase.ts  Supabase client — reads env vars only, never hard-coded
├── utils/           category/source metadata, URL normalization, CSV/bookmark
│                    parsing, link-preview + AI-suggestion + link-check clients,
│                    filtering/sorting
└── types/           shared TypeScript types
```

**Data flow:** `AppLayout` creates one `useLinks()` instance, passed to every routed page via a render-prop. All filtering/sorting/searching happens client-side over that one in-memory list — appropriate at the "hundreds to low thousands of links" scale this app targets (see §13, Performance). `AllLinks` is fully URL-query-param-driven (category/source/tag/favorite/important/archived/recentDays/search) specifically so Natural Language Search can deep-link into a fully filtered view by constructing a URL, rather than needing shared in-memory state between components that aren't otherwise connected.

**Organizational hierarchy:** Source (root: YouTube/Facebook/Instagram/Website, user-extensible) → Category (nested: Business/Health/etc., user-extensible) → Tags (free-form, many-to-many via a `text[]` column). Both Sources and Categories are per-user rows in their own tables (not a fixed global enum), each with a protected system default ("Website" / "Uncategorized") that link rows fall back to if their source/category is deleted.

## 2. Database schema

All tables are Postgres, in the `public` schema, with Row Level Security enabled (see §12). Full DDL is in `supabase/schema.sql`; incremental migrations for existing projects are the numbered `supabase/migration_*.sql` files.

**`categories`** — `id, user_id, key, label, emoji, sort_order, is_system, created_at`. Unique on `(user_id, key)`.

**`sources`** — `id, user_id, key, label, icon, sort_order, is_system, created_at`. Unique on `(user_id, key)`.

**`links`** — the core table:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | |
| `url`, `title` | text | |
| `description` | text, nullable | Auto-fetched OG description, editable |
| `notes` | text, nullable | Personal notes, separate from `description`, searchable |
| `thumbnail_url` | text, nullable | |
| `source` | text | FK → `sources(user_id, key)` |
| `category` | text | FK → `categories(user_id, key)` |
| `tags` | text[] | GIN-indexed |
| `is_favorite`, `is_important`, `is_archived`, `is_deleted` | boolean | |
| `view_count` | int | Incremented on open via LinkVault |
| `last_opened_at` | timestamptz, nullable | Powers "Recently Opened" |
| `link_status` | text, check `active|unknown|broken` | Set by manual/batch link-health checks only |
| `last_checked_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | `updated_at` auto-maintained via trigger |

Indexes: `user_id`, `category`, `source`, `created_at desc`, `last_opened_at desc`, `link_status`, and a GIN index on `tags`.

## 3. API endpoints (Supabase Edge Functions)

All four are Deno-based Edge Functions under `supabase/functions/`, each requiring a valid user JWT (`verify_jwt = true` in `supabase/config.toml`) — anonymous requests are rejected at the platform gateway before the function code even runs.

| Function | Purpose | External calls | Auth required |
|---|---|---|---|
| `link-preview` | Fetches a URL server-side, parses Open Graph tags (or YouTube oEmbed) | The target URL itself only | Yes |
| `ai-categorize` | Suggests a category + 3–6 tags for a link | Anthropic Claude API | Yes |
| `nl-search` | Translates a natural-language query into structured filters | Anthropic Claude API | Yes |
| `check-link` | HEAD/GET-probes a URL to determine active/broken status | The target URL itself only | Yes |

None of these write to the database directly — they return data, and the frontend (already authenticated as the user, subject to RLS) performs the actual read/write against `links`/`categories`/`sources`. This means even if an Edge Function had a bug, it structurally cannot bypass RLS to touch another user's data, because it never touches the database at all.

`_shared/ai.ts` centralizes the Anthropic API call (model: `claude-haiku-4-5-20251001`, chosen for latency/cost given these are short, structured, non-creative tasks) used by both `ai-categorize` and `nl-search`.

## 4. Environment variables

**Frontend (`.env.local`, both required):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Supabase Edge Function secrets** (server-side only, never sent to the frontend):
- `ANTHROPIC_API_KEY` — required for `ai-categorize` and `nl-search` to work. Set via `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`. Without it, those two features degrade gracefully (the "Suggest" AI button and the sparkle/NL-search icon show an error message when clicked) — nothing else in the app depends on this key.

`link-preview` and `check-link` need no secrets at all.

## 5. AI integration

Two features call Claude, both **strictly optional and additive** — neither blocks or is required for normal saving/searching:

- **Auto-categorization** (`ai-categorize`): triggered by an explicit "Suggest" button in the Add Link form (never automatic). Sends the URL/title/description plus the user's *actual* existing category and tag names, so Claude is grounded to prefer reusing what already exists rather than inventing near-duplicates. Returns a suggestion the user must explicitly **Accept** (merges category + tags into the form) or can **Reject** (discards it) — nothing is applied automatically.
- **Natural language search** (`nl-search`): triggered from a sparkle icon in the top bar, entirely separate UI from the normal keyword search box, which is untouched and always available regardless of whether this feature works or Claude is configured. Grounded the same way (only ever returns category/source/tag values that actually exist for that user), translating things like "show my favorite marketing links" into `{favoriteOnly: true, tags: ["marketing"]}`, which the frontend applies as normal URL-driven filters on the All Links page.

Both prompts explicitly instruct Claude to respond with raw JSON only, and both are parsed defensively (stripping markdown fences before `JSON.parse`, with try/catch around the whole call so a malformed response degrades to a visible error rather than a crash).

## 6. Deployment process

**Frontend:** static Vite build (`npm run build` → `dist/`), deployable to Vercel/Cloudflare Pages/Netlify/any static host. Needs the two `VITE_*` env vars set in the host's dashboard.

**Backend:** Supabase project — run `supabase/schema.sql` (fresh) or the relevant `migration_*.sql` files (upgrading), then `supabase functions deploy <name>` for each of the four functions, then `supabase secrets set ANTHROPIC_API_KEY=...`.

**PWA:** `vite-plugin-pwa` generates the service worker and precache manifest at build time automatically — no separate deployment step, it's part of the same `npm run build`.

**Browser extension:** not published to a web store (see `extension/README.md`) — currently a "load unpacked" developer-mode install, pointed at your Supabase project via its own Options page (same URL/anon key as the web app's `.env.local`).

## 9. Security review

- **Row Level Security**: every table (`links`, `categories`, `sources`) has RLS enabled with policies scoped to `auth.uid() = user_id` for select/insert/update/delete. System-default rows (`is_system = true`, e.g. "Website"/"Uncategorized") additionally block update/delete at the policy level, not just in the UI — so even a crafted direct API call can't modify or remove them.
- **Authentication**: Supabase Auth (email/password, optional Google OAuth). Sessions are managed by `@supabase/supabase-js` in the frontend and refreshed automatically; the extension does the same manually against the Auth REST endpoints (see `extension/README.md`).
- **API endpoints**: all four Edge Functions require a valid JWT (`supabase/config.toml`, `verify_jwt = true`) — anonymous calls are rejected before function code runs. None of them touch the database directly (see §3), so even a hypothetical bug in one can't bypass RLS.
- **Input validation**: URLs are validated with the `URL` constructor before save (client-side) and again before fetch (Edge Functions reject non-http(s) protocols). Required fields are checked before submission.
- **XSS**: no `dangerouslySetInnerHTML` anywhere in the codebase — all user/AI/scraped content (titles, descriptions, notes) is rendered as plain React text, which auto-escapes. Link URLs are only ever used as `href`/`window.open` targets or `fetch()` targets after `new URL()` validation, never interpolated into HTML strings.
- **Secrets**: `ANTHROPIC_API_KEY` lives only in Supabase's server-side secrets store, read via `Deno.env.get()` inside Edge Functions — it is never present in the frontend bundle, any `.env.local`/`VITE_*` variable, or any Edge Function response. The Supabase anon key is intentionally public (protected by RLS, not secrecy) and is safe to embed in both the frontend build and the browser extension's config.
- **Cross-user access**: verified by inspection of every query in `useLinks`/`useCategories`/`useSources` — none constructs a query using another user's ID, and RLS would reject it server-side even if one did.

## 10. Performance

- **Debounced search** (250ms) in the top bar, so filtering hundreds of links doesn't recompute on every keystroke.
- **Windowed pagination**: All Links renders 60 items at a time with a "Load More" button, instead of mounting every card at once — the underlying filtered/sorted array is still computed once, only the DOM output is capped.
- **Lazy-loaded thumbnails**: grid card images use `loading="lazy"`.
- **Database indexes**: `user_id`, `category`, `source`, `created_at desc`, `last_opened_at desc`, `link_status`, and a GIN index on `tags` for fast array-containment lookups.
- **Manual, rate-limited link health checks**: batch checking runs with a concurrency cap of 4 in-flight requests, never all-at-once, and only ever on explicit user action.

## 11. Future extension possibilities

- **Chrome Web Store publishing** for the extension (needs a privacy policy + review submission + build/versioning pipeline).
- **Real-time sync**: Supabase's Realtime channels could push live updates across open tabs/devices instead of the current per-action optimistic-update model.
- **Scheduled link health checks**: currently manual-only by design (see §10 of the STAGE2 brief); a Supabase Scheduled Function (pg_cron-backed) could run a periodic batch check if the user opts in, without violating the "never scan automatically without user control" constraint — it would need an explicit settings toggle.
- **True offline data**: currently only the app shell is cached (see §7 of the PWA section below); an IndexedDB-backed cache of the links list would let the app show (stale) data offline, with a clear "offline — showing cached data" indicator so it's never misleading about freshness.
- **Server-side pagination**: if a user's library grows into the tens of thousands of links, the current "load everything into one client-side list" model would need to become paginated at the Supabase query level, not just windowed at render time (see §13).

## 12. Known limitations

- **Facebook/Instagram link previews are inconsistent** — both platforms serve limited HTML (or require login) to non-browser requests, so `link-preview`'s Open Graph scraping sometimes finds nothing. Falls back to manual entry.
- **Tags are a `text[]` column, not a join table** — renaming/deleting a tag does one UPDATE per affected link. Fine at personal-library scale; would need restructuring at very large scale.
- **AI suggestions are only as good as Claude's read of a title/URL/description** — they're a starting point requiring explicit accept, not an authority.
- **No automated test suite** — this was built and reviewed in a sandboxed environment without package-registry access, so `npm install`/`tsc`/`vite build` could not be run here to mechanically verify a clean build. Verification was manual: import-resolution grepping, type-consistency review, and careful reading of every changed file. **Please run `npm install && npm run build` locally as your first step** and report anything that surfaces.
- **PWA offline support is shell-only, not data** — by design (see the "PWA" bullet in `README.md`'s STAGE2 section, and the note in `vite.config.ts`): the app installs and loads instantly offline, but saved links themselves require a network connection, since pretending otherwise would be actively misleading.
- **The browser extension is unpublished** and requires manual "load unpacked" installation and one-time Supabase URL/key configuration per browser profile.
- **Search remains client-side** over the already-loaded links list — fast at hundreds of links, would need a real search index (e.g. Postgres full-text search or a dedicated search service) at much larger scale.
