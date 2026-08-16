import { useNavigate } from 'react-router-dom'
import type { LinkRecord } from '@/types'

interface PopularTagsProps {
  links: LinkRecord[]
}

export function PopularTags({ links }: PopularTagsProps) {
  const navigate = useNavigate()
  const active = links.filter((l) => !l.is_deleted)

  const counts = new Map<string, number>()
  for (const link of active) {
    for (const tag of link.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16)

  if (topTags.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Tags you add to links will show up here for quick filtering.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topTags.map(([tag, count]) => (
        <button
          key={tag}
          onClick={() => navigate(`/links?tag=${encodeURIComponent(tag)}`)}
          className="flex items-center gap-1.5 text-sm bg-base-900 border border-base-700/60 text-slate-300
            px-3 py-1.5 rounded-full hover:border-accent-500/40 hover:text-accent-300 transition-colors"
        >
          {tag}
          <span className="text-xs text-slate-500">{count}</span>
        </button>
      ))}
    </div>
  )
}
