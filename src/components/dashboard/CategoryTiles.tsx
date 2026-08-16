import { useNavigate } from 'react-router-dom'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import type { LinkRecord } from '@/types'

interface CategoryTilesProps {
  links: LinkRecord[]
}

export function CategoryTiles({ links }: CategoryTilesProps) {
  const navigate = useNavigate()
  const { categories } = useCategoriesContext()
  const active = links.filter((l) => !l.is_deleted && !l.is_archived)

  function countFor(key: string) {
    return active.filter((l) => l.category === key).length
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/links?category=${c.key}`)}
          className="flex flex-col items-start gap-2 bg-base-900 border border-base-700/60 rounded-2xl p-4
            hover:border-accent-500/40 hover:-translate-y-0.5 hover:shadow-card transition-all text-left"
        >
          <span className="text-2xl">{c.emoji}</span>
          <span className="text-sm font-semibold text-slate-100">{c.label}</span>
          <span className="text-xs text-slate-400">{countFor(c.key)} links</span>
        </button>
      ))}
    </div>
  )
}
