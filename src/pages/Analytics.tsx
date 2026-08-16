import { useMemo } from 'react'
import { Link2, CalendarDays, LayoutGrid, Eye, Tag as TagIcon } from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { categoryLabel, categoryEmoji } from '@/utils/categories'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks>

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-base-800 overflow-hidden">
        <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Analytics({ links }: Props) {
  const { categories } = useCategoriesContext()
  const active = useMemo(() => links.filter((l) => !l.is_deleted), [links])

  const startOfMonth = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  }, [])

  const addedThisMonth = active.filter((l) => new Date(l.created_at).getTime() >= startOfMonth).length

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of active) counts.set(l.category, (counts.get(l.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [active])

  const mostViewed = useMemo(
    () => [...active].filter((l) => l.view_count > 0).sort((a, b) => b.view_count - a.view_count).slice(0, 6),
    [active]
  )

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of active) for (const t of l.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [active])

  const maxCategoryCount = categoryCounts[0]?.[1] ?? 1
  const maxTagCount = topTags[0]?.[1] ?? 1
  const maxViews = mostViewed[0]?.view_count ?? 1

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">A quick look at how you're using your library.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Links', value: active.length, icon: Link2 },
          { label: 'Added This Month', value: addedThisMonth, icon: CalendarDays },
          { label: 'Categories Used', value: new Set(active.map((l) => l.category)).size, icon: LayoutGrid },
          { label: 'Total Views', value: active.reduce((s, l) => s + l.view_count, 0), icon: Eye },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-base-900 border border-base-700/60 rounded-2xl p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-accent-600/10 flex items-center justify-center mb-3">
              <Icon size={17} className="text-accent-400" />
            </div>
            <p className="text-2xl font-display font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <section className="bg-base-900 border border-base-700/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Most Used Categories</h3>
        {categoryCounts.length === 0 ? (
          <p className="text-sm text-slate-500">No links yet.</p>
        ) : (
          <div className="space-y-3">
            {categoryCounts.map(([key, count]) => (
              <Bar
                key={key}
                label={`${categoryEmoji(categories, key)} ${categoryLabel(categories, key)}`}
                value={count}
                max={maxCategoryCount}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bg-base-900 border border-base-700/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Most Viewed Links</h3>
        {mostViewed.length === 0 ? (
          <p className="text-sm text-slate-500">Links you open through LinkVault will show up here.</p>
        ) : (
          <div className="space-y-3">
            {mostViewed.map((l) => (
              <Bar key={l.id} label={l.title} value={l.view_count} max={maxViews} suffix=" views" />
            ))}
          </div>
        )}
      </section>

      <section className="bg-base-900 border border-base-700/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TagIcon size={15} className="text-accent-400" /> Most Frequently Used Tags
        </h3>
        {topTags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags yet.</p>
        ) : (
          <div className="space-y-3">
            {topTags.map(([tag, count]) => (
              <Bar key={tag} label={`#${tag}`} value={count} max={maxTagCount} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
