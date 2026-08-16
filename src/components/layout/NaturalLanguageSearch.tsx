import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { LinkRecord } from '@/types'

interface NlFilters {
  keywords?: string
  category?: string
  source?: string
  tags?: string[]
  favoriteOnly?: boolean
  importantOnly?: boolean
  recentDays?: number
}

const EXAMPLES = [
  'Show my business ideas',
  'YouTube videos about terrarium lighting',
  'Health links I saved recently',
  'My favorite marketing links',
]

export function NaturalLanguageSearch({ links }: { links: LinkRecord[] }) {
  const navigate = useNavigate()
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)

    const allTags = [...new Set(links.flatMap((l) => l.tags ?? []))]

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nl-search', {
        body: {
          query: q,
          categories: categories.map((c) => c.label),
          sources: sources.map((s) => s.label),
          tags: allTags,
        },
      })
      if (fnError) throw new Error("Couldn't reach the AI search function. Make sure nl-search is deployed.")
      if (data?.error) throw new Error(data.error)

      const filters = data as NlFilters
      const params = new URLSearchParams()
      if (filters.keywords) params.set('q', filters.keywords)
      if (filters.category) {
        const match = categories.find((c) => c.label.toLowerCase() === filters.category!.toLowerCase())
        if (match) params.set('category', match.key)
      }
      if (filters.source) {
        const match = sources.find((s) => s.label.toLowerCase() === filters.source!.toLowerCase())
        if (match) params.set('source', match.key)
      }
      if (filters.tags?.[0]) params.set('tag', filters.tags[0])
      if (filters.favoriteOnly) params.set('favorite', '1')
      if (filters.importantOnly) params.set('important', '1')
      if (filters.recentDays) params.set('recentDays', String(filters.recentDays))

      navigate(`/links?${params.toString()}`)
      setOpen(false)
      setQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search translation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-base-800 transition-colors"
        aria-label="Ask AI to search"
        title="Ask AI to search"
      >
        <Sparkles size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-base-850 border border-base-700 rounded-xl shadow-card p-4 z-50">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent-400" />
                Ask AI to find links
              </p>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                runSearch(query)
              }}
            >
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "Show my business ideas"'
                className="field-input text-sm"
              />
            </form>

            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

            <div className="mt-3">
              <p className="text-[11px] text-slate-500 mb-1.5">Try:</p>
              <div className="flex flex-col gap-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setQuery(ex)
                      runSearch(ex)
                    }}
                    className="text-left text-xs text-slate-400 hover:text-accent-300 transition-colors"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => runSearch(query)}
              disabled={loading || !query.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
                disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Search
            </button>
          </div>
        </>
      )}
    </div>
  )
}
