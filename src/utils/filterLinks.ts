import { categoryLabel } from './categories'
import { sourceLabel } from './source'
import type { CategoryKey, CategoryRecord, LinkRecord, SortOption, SourceRecord } from '@/types'

interface FilterOptions {
  search?: string
  category?: CategoryKey | 'all'
  source?: string | 'all'
  tag?: string | null
  favoriteOnly?: boolean
  importantOnly?: boolean
  includeArchived?: boolean
  recentDays?: number | null
  sort?: SortOption
  categories?: CategoryRecord[]
  sources?: SourceRecord[]
}

export function filterAndSortLinks(links: LinkRecord[], opts: FilterOptions): LinkRecord[] {
  const {
    search = '',
    category = 'all',
    source = 'all',
    tag = null,
    favoriteOnly = false,
    importantOnly = false,
    includeArchived = false,
    recentDays = null,
    sort = 'newest',
    categories = [],
    sources = [],
  } = opts
  const q = search.trim().toLowerCase()
  const recentCutoff = recentDays ? Date.now() - recentDays * 24 * 60 * 60 * 1000 : null

  let result = links.filter((link) => {
    if (!includeArchived && link.is_archived) return false
    if (category !== 'all' && link.category !== category) return false
    if (source !== 'all' && link.source !== source) return false
    if (tag && !(link.tags ?? []).includes(tag)) return false
    if (favoriteOnly && !link.is_favorite) return false
    if (importantOnly && !link.is_important) return false
    if (recentCutoff && new Date(link.created_at).getTime() < recentCutoff) return false

    if (q) {
      const haystack = [
        link.title,
        link.description ?? '',
        link.notes ?? '',
        categoryLabel(categories, link.category),
        sourceLabel(sources, link.source),
        ...(link.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })

  result = [...result].sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sort === 'alphabetical') return a.title.localeCompare(b.title)
    return b.view_count - a.view_count
  })

  return result
}
