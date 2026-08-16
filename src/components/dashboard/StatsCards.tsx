import { Link2, LayoutGrid, Star, CalendarPlus, Flag, Eye } from 'lucide-react'
import type { LinkRecord } from '@/types'

interface StatsCardsProps {
  links: LinkRecord[]
}

export function StatsCards({ links }: StatsCardsProps) {
  const active = links.filter((l) => !l.is_deleted)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const totalViews = active.reduce((sum, l) => sum + l.view_count, 0)

  const stats = [
    { label: 'Total Links', value: active.length, icon: Link2 },
    { label: 'Categories', value: new Set(active.map((l) => l.category)).size, icon: LayoutGrid },
    { label: 'Favorites', value: active.filter((l) => l.is_favorite).length, icon: Star },
    { label: 'Important', value: active.filter((l) => l.is_important).length, icon: Flag },
    {
      label: 'Added This Week',
      value: active.filter((l) => new Date(l.created_at).getTime() >= oneWeekAgo).length,
      icon: CalendarPlus,
    },
    { label: 'Total Views', value: totalViews, icon: Eye },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-base-900 border border-base-700/60 rounded-2xl p-4 sm:p-5 hover:border-accent-500/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-accent-600/10 flex items-center justify-center mb-3">
            <Icon size={17} className="text-accent-400" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
