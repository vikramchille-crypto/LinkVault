import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LinksToolbar } from '@/components/links/LinksToolbar'
import { LinkGrid } from '@/components/links/LinkGrid'
import { AddLinkModal } from '@/components/links/AddLinkModal'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { useLinkActions } from '@/hooks/useLinkActions'
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { filterAndSortLinks } from '@/utils/filterLinks'
import type { useLinks } from '@/hooks/useLinks'
import type { CategoryKey, SortOption } from '@/types'

type AllLinksProps = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

// Every filter dimension here is driven by the URL, not local component
// state — this is what lets Natural Language Search (and anything else)
// deep-link straight into a fully filtered view via query params.
export function AllLinks(props: AllLinksProps) {
  const { links, loading, error, refresh, search, openAddLink, updateLink } = props
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sort, setSort] = useState<SortOption>('newest')
  const [view, setView] = usePersistedViewMode()
  const { editingLink, closeEdit, ...actions } = useLinkActions(props)

  const category = (searchParams.get('category') as CategoryKey | 'all') ?? 'all'
  const source = searchParams.get('source') ?? 'all'
  const tag = searchParams.get('tag') ?? 'all'
  const favoriteOnly = searchParams.get('favorite') === '1'
  const importantOnly = searchParams.get('important') === '1'
  const includeArchived = searchParams.get('archived') === '1'
  const recentDaysParam = searchParams.get('recentDays')
  const recentDays = recentDaysParam ? Number(recentDaysParam) : null
  // The NL search function may translate "leftover" free text into a `q`
  // param on top of the normal search bar's own `search` state — combine
  // both so neither silently overrides the other.
  const nlKeywords = searchParams.get('q') ?? ''
  const effectiveSearch = [search, nlKeywords].filter(Boolean).join(' ').trim()

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const l of links) {
      if (l.is_deleted) continue
      for (const t of l.tags ?? []) set.add(t)
    }
    return [...set].sort()
  }, [links])

  const hasFilters = Boolean(
    effectiveSearch || category !== 'all' || source !== 'all' || tag !== 'all' || favoriteOnly || importantOnly
  )

  const PAGE_SIZE = 60
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  // Reset the "Load More" window whenever the actual filter criteria change
  // (not on every links mutation — favoriting a link shouldn't collapse
  // your scroll position back to 60 items).
  useEffect(() => {
    setPageSize(PAGE_SIZE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSearch, category, source, tag, favoriteOnly, importantOnly, includeArchived, recentDays, sort])

  const visible = useMemo(() => {
    const active = links.filter((l) => !l.is_deleted)
    return filterAndSortLinks(active, {
      search: effectiveSearch,
      category,
      source,
      tag: tag === 'all' ? null : tag,
      favoriteOnly,
      importantOnly,
      includeArchived,
      recentDays,
      sort,
      categories,
      sources,
    })
  }, [
    links,
    effectiveSearch,
    category,
    source,
    tag,
    favoriteOnly,
    importantOnly,
    includeArchived,
    recentDays,
    sort,
    categories,
    sources,
  ])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-white">All Links</h2>
        <p className="text-sm text-slate-400 mt-1">Browse, filter and manage your entire library.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <LoadingGrid count={12} />
      ) : (
        <>
          <LinksToolbar
            category={category}
            onCategoryChange={(v) => setParam('category', v)}
            source={source}
            onSourceChange={(v) => setParam('source', v)}
            tag={tag}
            onTagChange={(v) => setParam('tag', v)}
            availableTags={availableTags}
            favoriteOnly={favoriteOnly}
            onFavoriteOnlyChange={(v) => setParam('favorite', v ? '1' : null)}
            importantOnly={importantOnly}
            onImportantOnlyChange={(v) => setParam('important', v ? '1' : null)}
            includeArchived={includeArchived}
            onIncludeArchivedChange={(v) => setParam('archived', v ? '1' : null)}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
            resultCount={visible.length}
          />
          <LinkGrid
            links={visible.slice(0, pageSize)}
            view={view}
            emptyTitle={hasFilters ? 'No links match your filters' : 'No links yet'}
            emptyDescription={
              hasFilters
                ? 'Try a different search term or clear your filters.'
                : 'Save your first useful link to start building your personal library.'
            }
            emptyActionLabel={hasFilters ? undefined : 'Add Link'}
            onEmptyAction={openAddLink}
            {...actions}
          />
          {visible.length > pageSize && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPageSize((n) => n + PAGE_SIZE)}
                className="text-sm font-semibold text-slate-300 hover:text-white bg-base-800 hover:bg-base-700
                  border border-base-700 px-5 py-2.5 rounded-xl transition-colors"
              >
                Load {Math.min(PAGE_SIZE, visible.length - pageSize)} more ({visible.length - pageSize} remaining)
              </button>
            </div>
          )}
        </>
      )}

      <AddLinkModal
        open={!!editingLink}
        onClose={closeEdit}
        editingLink={editingLink}
        onSubmit={(input) => updateLink(editingLink!.id, input)}
      />
    </div>
  )
}
