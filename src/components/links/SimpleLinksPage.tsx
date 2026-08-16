import { useMemo, useState } from 'react'
import { LinkGrid } from './LinkGrid'
import { LinksToolbar } from './LinksToolbar'
import { AddLinkModal } from './AddLinkModal'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { useLinkActions } from '@/hooks/useLinkActions'
import { usePersistedViewMode } from '@/hooks/usePersistedViewMode'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { filterAndSortLinks } from '@/utils/filterLinks'
import type { useLinks } from '@/hooks/useLinks'
import type { CategoryKey, LinkRecord, SortOption } from '@/types'

interface SimpleLinksPageProps {
  state: ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }
  title: string
  subtitle: string
  filter: (link: LinkRecord) => boolean
  emptyTitle: string
  emptyDescription: string
  showCategoryFilter?: boolean
  // Archive page: its own `filter` already selects archived items, so the
  // toolbar's "Include Archived" exclusion (which defaults to hiding
  // archived items everywhere else) must be bypassed here.
  alwaysIncludeArchived?: boolean
}

export function SimpleLinksPage({
  state,
  title,
  subtitle,
  filter,
  emptyTitle,
  emptyDescription,
  showCategoryFilter = true,
  alwaysIncludeArchived = false,
}: SimpleLinksPageProps) {
  const { links, loading, error, refresh, search, updateLink } = state
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const [category, setCategory] = useState<CategoryKey | 'all'>('all')
  const [source, setSource] = useState<string | 'all'>('all')
  const [tag, setTag] = useState<string | 'all'>('all')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [importantOnly, setImportantOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(alwaysIncludeArchived)
  const [sort, setSort] = useState<SortOption>('newest')
  const [view, setView] = usePersistedViewMode()
  const { editingLink, closeEdit, ...actions } = useLinkActions(state)

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const l of links.filter(filter)) {
      for (const t of l.tags ?? []) set.add(t)
    }
    return [...set].sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links])

  const visible = useMemo(() => {
    const base = links.filter(filter)
    return filterAndSortLinks(base, {
      search,
      category,
      source,
      tag: tag === 'all' ? null : tag,
      favoriteOnly,
      importantOnly,
      includeArchived: alwaysIncludeArchived || includeArchived,
      sort,
      categories,
      sources,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, search, category, source, tag, favoriteOnly, importantOnly, includeArchived, sort, categories, sources])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <LoadingGrid count={8} />
      ) : (
        <>
          {showCategoryFilter && (
            <LinksToolbar
              category={category}
              onCategoryChange={setCategory}
              source={source}
              onSourceChange={setSource}
              tag={tag}
              onTagChange={setTag}
              availableTags={availableTags}
              favoriteOnly={favoriteOnly}
              onFavoriteOnlyChange={setFavoriteOnly}
              importantOnly={importantOnly}
              onImportantOnlyChange={setImportantOnly}
              includeArchived={includeArchived}
              onIncludeArchivedChange={setIncludeArchived}
              showArchivedToggle={!alwaysIncludeArchived}
              sort={sort}
              onSortChange={setSort}
              view={view}
              onViewChange={setView}
              resultCount={visible.length}
            />
          )}
          <LinkGrid
            links={visible}
            view={view}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            {...actions}
          />
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
