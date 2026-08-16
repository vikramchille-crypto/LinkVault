import { LayoutGrid, List, Star, Flag, Archive } from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { CategoryKey, SortOption, ViewMode } from '@/types'

interface LinksToolbarProps {
  category: CategoryKey | 'all'
  onCategoryChange: (value: CategoryKey | 'all') => void
  source: string | 'all'
  onSourceChange: (value: string | 'all') => void
  tag: string | 'all'
  onTagChange: (value: string | 'all') => void
  availableTags: string[]
  favoriteOnly: boolean
  onFavoriteOnlyChange: (value: boolean) => void
  importantOnly: boolean
  onImportantOnlyChange: (value: boolean) => void
  includeArchived: boolean
  onIncludeArchivedChange: (value: boolean) => void
  showArchivedToggle?: boolean
  sort: SortOption
  onSortChange: (value: SortOption) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  resultCount: number
}

export function LinksToolbar({
  category,
  onCategoryChange,
  source,
  onSourceChange,
  tag,
  onTagChange,
  availableTags,
  favoriteOnly,
  onFavoriteOnlyChange,
  importantOnly,
  onImportantOnlyChange,
  includeArchived,
  onIncludeArchivedChange,
  showArchivedToggle = true,
  sort,
  onSortChange,
  view,
  onViewChange,
  resultCount,
}: LinksToolbarProps) {
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()

  const selectClasses =
    'bg-base-800 border border-base-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-500/60'

  function chipClasses(active: boolean) {
    return `flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors ${
      active
        ? 'bg-accent-600/15 text-accent-300 border-accent-500/40'
        : 'bg-base-800 text-slate-300 border-base-700 hover:border-base-600'
    }`
  }

  return (
    <div className="space-y-3 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-slate-400 shrink-0">{resultCount} links</p>

        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          <select value={source} onChange={(e) => onSourceChange(e.target.value)} className={selectClasses}>
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.key}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as CategoryKey | 'all')}
            className={selectClasses}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>

          {availableTags.length > 0 && (
            <select value={tag} onChange={(e) => onTagChange(e.target.value)} className={selectClasses}>
              <option value="all">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className={selectClasses}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="most_viewed">Most viewed</option>
            <option value="alphabetical">Alphabetical</option>
          </select>

          <div className="flex items-center bg-base-800 border border-base-700 rounded-xl p-0.5">
            <button
              onClick={() => onViewChange('grid')}
              className={`p-1.5 rounded-lg ${view === 'grid' ? 'bg-accent-600 text-white' : 'text-slate-400'}`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => onViewChange('list')}
              className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-accent-600 text-white' : 'text-slate-400'}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onFavoriteOnlyChange(!favoriteOnly)} className={chipClasses(favoriteOnly)}>
          <Star size={14} className={favoriteOnly ? 'fill-accent-400' : ''} />
          Favorites
        </button>
        <button onClick={() => onImportantOnlyChange(!importantOnly)} className={chipClasses(importantOnly)}>
          <Flag size={14} className={importantOnly ? 'fill-accent-400' : ''} />
          Important
        </button>
        {showArchivedToggle && (
          <button
            onClick={() => onIncludeArchivedChange(!includeArchived)}
            className={chipClasses(includeArchived)}
          >
            <Archive size={14} />
            Include Archived
          </button>
        )}
      </div>
    </div>
  )
}
