// Categories are now user-managed (stored in Supabase, see useCategories),
// so a category is identified by a free-form string "key" rather than a
// fixed union. CategoryRecord is the shape of a row in the categories table.
export type CategoryKey = string

export interface CategoryRecord {
  id: string
  user_id: string
  key: string
  label: string
  emoji: string
  sort_order: number
  is_system: boolean
  created_at: string
}

export interface SourceRecord {
  id: string
  user_id: string
  key: string
  label: string
  icon: string
  sort_order: number
  is_system: boolean
  created_at: string
}

export type LinkStatus = 'active' | 'unknown' | 'broken'

export interface LinkRecord {
  id: string
  user_id: string
  url: string
  title: string
  description: string | null
  notes: string | null
  thumbnail_url: string | null
  source: string
  category: CategoryKey
  tags: string[]
  is_favorite: boolean
  is_important: boolean
  is_archived: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  last_opened_at: string | null
  link_status: LinkStatus
  last_checked_at: string | null
  view_count: number
}

// Shape used by the Add/Edit Link form before it is persisted.
export interface LinkFormInput {
  url: string
  title: string
  description: string
  notes: string
  thumbnail_url: string
  category: CategoryKey
  source: string
  tags: string[]
  is_favorite: boolean
  is_important: boolean
}

export type SortOption = 'newest' | 'oldest' | 'most_viewed' | 'alphabetical'
export type ViewMode = 'grid' | 'list'

export interface LinkFilters {
  search: string
  category: CategoryKey | 'all'
  sort: SortOption
}
