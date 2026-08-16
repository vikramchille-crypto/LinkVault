import { useNavigate } from 'react-router-dom'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { LinkRecord } from '@/types'

interface SourceTilesProps {
  links: LinkRecord[]
}

export function SourceTiles({ links }: SourceTilesProps) {
  const navigate = useNavigate()
  const { sources } = useSourcesContext()
  const active = links.filter((l) => !l.is_deleted && !l.is_archived)

  function countFor(key: string) {
    return active.filter((l) => l.source === key).length
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {sources.map((s) => (
        <button
          key={s.id}
          onClick={() => navigate(`/links?source=${s.key}`)}
          className="flex flex-col items-start gap-2 bg-base-900 border border-base-700/60 rounded-2xl p-4
            hover:border-accent-500/40 hover:-translate-y-0.5 hover:shadow-card transition-all text-left"
        >
          <span className="text-2xl">{s.icon}</span>
          <span className="text-sm font-semibold text-slate-100">{s.label}</span>
          <span className="text-xs text-slate-400">{countFor(s.key)} links</span>
        </button>
      ))}
    </div>
  )
}
