import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { SourceTiles } from '@/components/dashboard/SourceTiles'
import { CategoryTiles } from '@/components/dashboard/CategoryTiles'
import { PopularTags } from '@/components/dashboard/PopularTags'
import { LinkGrid } from '@/components/links/LinkGrid'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { AddLinkModal } from '@/components/links/AddLinkModal'
import { useLinkActions } from '@/hooks/useLinkActions'
import type { useLinks } from '@/hooks/useLinks'

type DashboardProps = ReturnType<typeof useLinks> & { openAddLink: () => void }

export function Dashboard(props: DashboardProps) {
  const { links, loading, error, refresh, openAddLink, updateLink } = props
  const { user } = useAuth()
  const { categories } = useCategoriesContext()
  const { editingLink, closeEdit, ...actions } = useLinkActions(props)

  const active = links.filter((l) => !l.is_deleted && !l.is_archived)
  const categoriesUsed = new Set(active.map((l) => l.category)).size

  const recent = [...active]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const mostViewed = [...active]
    .filter((l) => l.view_count > 0)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 8)

  const favorites = active.filter((l) => l.is_favorite).slice(0, 8)
  const important = active.filter((l) => l.is_important).slice(0, 8)

  // A single "spotlight" section for whichever category the user actually
  // uses most — a lightweight, data-driven stand-in for the brief's example
  // sections ("Business Ideas", "Learning", ...) without hardcoding names
  // that may not match this user's real categories, and without adding a
  // section per category (which would clutter the dashboard fast).
  const topCategoryCounts = new Map<string, number>()
  for (const l of active) topCategoryCounts.set(l.category, (topCategoryCounts.get(l.category) ?? 0) + 1)
  const topCategoryKey = [...topCategoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topCategory = categories.find((c) => c.key === topCategoryKey)
  const topCategoryLinks = topCategoryKey
    ? active.filter((l) => l.category === topCategoryKey).slice(0, 8)
    : []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Welcome back! 👋</h2>
          <p className="text-sm text-slate-400 mt-1">
            {user?.email ? `Signed in as ${user.email}. ` : ''}
            You have {active.length} saved link{active.length === 1 ? '' : 's'} across{' '}
            {categoriesUsed} categor{categoriesUsed === 1 ? 'y' : 'ies'}.
          </p>
        </div>
        <button
          onClick={openAddLink}
          className="sm:ml-auto flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
            text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-card transition-colors shrink-0"
        >
          <Plus size={16} />
          Add New Link
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-base-900 border border-base-700/60 rounded-2xl animate-pulse" />
            ))}
          </div>
          <LoadingGrid count={8} />
        </>
      ) : (
        <>
          <StatsCards links={links} />

          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Sources</h3>
            <SourceTiles links={links} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Categories</h3>
            <CategoryTiles links={links} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recently Added</h3>
            <LinkGrid
              links={recent}
              emptyTitle="No links yet"
              emptyDescription="Save your first useful link to start building your personal library."
              emptyActionLabel="Add Link"
              onEmptyAction={openAddLink}
              {...actions}
            />
          </section>

          {favorites.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Favorites</h3>
              <LinkGrid
                links={favorites}
                emptyTitle="No favorites yet"
                emptyDescription="Star a link from any card to pin it here."
                {...actions}
              />
            </section>
          )}

          {important.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Important</h3>
              <LinkGrid
                links={important}
                emptyTitle="Nothing marked important"
                emptyDescription="Flag a link as important from its menu to keep it top of mind here."
                {...actions}
              />
            </section>
          )}

          {mostViewed.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Most Viewed</h3>
              <LinkGrid
                links={mostViewed}
                emptyTitle="No views yet"
                emptyDescription="Links you open through LinkVault will show up here, ranked by views."
                {...actions}
              />
            </section>
          )}

          {topCategory && topCategoryLinks.length >= 3 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                {topCategory.emoji} {topCategory.label} — your most-saved category
              </h3>
              <LinkGrid links={topCategoryLinks} emptyTitle="" emptyDescription="" {...actions} />
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Popular Tags</h3>
            <PopularTags links={links} />
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
