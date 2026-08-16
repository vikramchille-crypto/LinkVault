import type { CategoryRecord } from '@/types'

// Used only once, to seed a brand-new user's category list on first sign-in.
// After that, categories live entirely in the database and users manage
// them from the Manage Categories screen.
export const DEFAULT_SEED_CATEGORIES: Array<Pick<CategoryRecord, 'key' | 'label' | 'emoji' | 'sort_order' | 'is_system'>> = [
  { key: 'business', label: 'Business', emoji: '💼', sort_order: 1, is_system: false },
  { key: 'health', label: 'Health', emoji: '🩺', sort_order: 2, is_system: false },
  { key: 'devotional', label: 'Devotional', emoji: '🙏', sort_order: 3, is_system: false },
  { key: 'ai_tech', label: 'AI & Tech', emoji: '🤖', sort_order: 4, is_system: false },
  { key: 'terrarium', label: 'Terrarium', emoji: '🌱', sort_order: 5, is_system: false },
  { key: 'social_media', label: 'Social Media', emoji: '📱', sort_order: 6, is_system: false },
  { key: 'finance', label: 'Finance', emoji: '💰', sort_order: 7, is_system: false },
  { key: 'learning', label: 'Learning', emoji: '📚', sort_order: 8, is_system: false },
  { key: 'uncategorized', label: 'Uncategorized', emoji: '📁', sort_order: 999, is_system: true },
]

export function categoryLabel(categories: CategoryRecord[], key: string): string {
  return categories.find((c) => c.key === key)?.label ?? key
}

export function categoryEmoji(categories: CategoryRecord[], key: string): string {
  return categories.find((c) => c.key === key)?.emoji ?? '🔗'
}

