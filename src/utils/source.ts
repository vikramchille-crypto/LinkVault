import type { SourceRecord } from '@/types'

// Seeded once for every new user. "website" is the protected catch-all for
// any link that isn't from a recognized social platform.
export const DEFAULT_SEED_SOURCES: Array<Pick<SourceRecord, 'key' | 'label' | 'icon' | 'sort_order' | 'is_system'>> = [
  { key: 'youtube', label: 'YouTube', icon: '▶️', sort_order: 1, is_system: false },
  { key: 'facebook', label: 'Facebook', icon: '📘', sort_order: 2, is_system: false },
  { key: 'instagram', label: 'Instagram', icon: '📸', sort_order: 3, is_system: false },
  { key: 'website', label: 'Website', icon: '🌐', sort_order: 999, is_system: true },
]

// Matches a pasted URL's domain against the user's managed source list, e.g.
// a link from youtube.com will auto-select whichever source has key
// "youtube" (if the user still has one — they're free to rename or delete
// it, in which case nothing is auto-selected and they choose manually).
const DOMAIN_PATTERNS: Record<string, RegExp> = {
  youtube: /youtube\.com|youtu\.be/,
  facebook: /facebook\.com|fb\.watch/,
  instagram: /instagram\.com/,
}

export function guessSourceKey(rawUrl: string, sources: SourceRecord[]): string | null {
  let host = ''
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return null
  }

  for (const [key, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    if (pattern.test(host) && sources.some((s) => s.key === key)) return key
  }

  // Anything else falls back to the protected "website" source, if present.
  const website = sources.find((s) => s.key === 'website')
  return website ? website.key : null
}

export function sourceLabel(sources: SourceRecord[], key: string): string {
  return sources.find((s) => s.key === key)?.label ?? key
}

export function sourceIcon(sources: SourceRecord[], key: string): string {
  return sources.find((s) => s.key === key)?.icon ?? '🔗'
}

export function relativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
