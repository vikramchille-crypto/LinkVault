import { useMemo } from 'react'
import { LinkGrid } from '@/components/links/LinkGrid'
import { AddLinkModal } from '@/components/links/AddLinkModal'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { useLinkActions } from '@/hooks/useLinkActions'
import { filterAndSortLinks } from '@/utils/filterLinks'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// Two distinct lists rather than one filterable table: "recently added"
// (by created_at) and "recently opened" (by last_opened_at, set whenever a
// link is opened through LinkVault) are genuinely different views a
// generic toolbar doesn't represent well.
export function Recent(props: Props) {
  const { links, loading, error, refresh, search, updateLink } = props
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const { editingLink, closeEdit, ...actions } = useLinkActions(props)

  const recentlyAdded = useMemo(() => {
    const base = links.filter(
      (l) => !l.is_deleted && !l.is_archived && Date.now() - new Date(l.created_at).getTime() <= THIRTY_DAYS_MS
    )
    return filterAndSortLinks(base, { search, sort: 'newest', categories, sources }).slice(0, 12)
  }, [links, search, categories, sources])

  const recentlyOpened = useMemo(() => {
    const base = links.filter((l) => !l.is_deleted && !l.is_archived && l.last_opened_at)
    const filtered = filterAndSortLinks(base, { search, categories, sources })
    return [...filtered]
      .sort((a, b) => new Date(b.last_opened_at!).getTime() - new Date(a.last_opened_at!).getTime())
      .slice(0, 12)
  }, [links, search, categories, sources])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Recent</h2>
        <p className="text-sm text-slate-400 mt-1">What you've added and opened lately.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <LoadingGrid count={8} />
      ) : (
        <>
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recently Added</h3>
            <LinkGrid
              links={recentlyAdded}
              emptyTitle="Nothing recent"
              emptyDescription="Links you save in the next 30 days will show up here."
              {...actions}
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recently Opened</h3>
            <LinkGrid
              links={recentlyOpened}
              emptyTitle="Nothing opened yet"
              emptyDescription="Links you open through LinkVault will show up here, most recent first."
              {...actions}
            />
          </section>
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
