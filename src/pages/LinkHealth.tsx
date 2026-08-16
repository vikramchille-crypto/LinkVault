import { useMemo, useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, PlayCircle } from 'lucide-react'
import { relativeDate } from '@/utils/source'
import type { useLinks } from '@/hooks/useLinks'
import type { LinkRecord } from '@/types'

type Props = ReturnType<typeof useLinks>

const STATUS_META: Record<LinkRecord['link_status'], { label: string; color: string; icon: typeof ShieldCheck }> = {
  active: { label: 'Active', color: 'text-emerald-400', icon: ShieldCheck },
  broken: { label: 'Broken', color: 'text-red-400', icon: ShieldAlert },
  unknown: { label: 'Unknown', color: 'text-slate-500', icon: ShieldQuestion },
}

// Concurrency-limited batch check — never fires hundreds of requests at
// once, and only ever runs when the user explicitly clicks "Check Links"
// (no background timers or automatic scanning).
const BATCH_CONCURRENCY = 4

export function LinkHealth({ links, checkLinkStatus }: Props) {
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })

  const active = useMemo(() => links.filter((l) => !l.is_deleted), [links])
  const counts = useMemo(() => {
    const c = { active: 0, broken: 0, unknown: 0 }
    for (const l of active) c[l.link_status]++
    return c
  }, [active])

  async function checkOne(link: LinkRecord) {
    setCheckingIds((prev) => new Set(prev).add(link.id))
    await checkLinkStatus(link)
    setCheckingIds((prev) => {
      const next = new Set(prev)
      next.delete(link.id)
      return next
    })
  }

  async function checkAll() {
    const targets = active.filter((l) => !checkingIds.has(l.id))
    if (targets.length === 0) return

    setBatchRunning(true)
    setBatchProgress({ done: 0, total: targets.length })

    let index = 0
    async function worker() {
      while (index < targets.length) {
        const link = targets[index++]
        await checkOne(link)
        setBatchProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    }

    await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, worker))
    setBatchRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white">Link Health</h2>
          <p className="text-sm text-slate-400 mt-1">
            Check whether your saved links still resolve. Only runs when you ask it to.
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={batchRunning}
          className="sm:ml-auto flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
            disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          {batchRunning ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
          {batchRunning ? `Checking ${batchProgress.done}/${batchProgress.total}...` : 'Check All Links'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['active', 'broken', 'unknown'] as const).map((status) => {
          const meta = STATUS_META[status]
          const Icon = meta.icon
          return (
            <div key={status} className="bg-base-900 border border-base-700/60 rounded-2xl p-4">
              <Icon size={18} className={meta.color} />
              <p className="text-2xl font-display font-bold text-white mt-2">{counts[status]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{meta.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-base-900 border border-base-700/60 rounded-2xl divide-y divide-base-700/60">
        {active.length === 0 ? (
          <p className="text-sm text-slate-500 px-5 py-8 text-center">No links yet.</p>
        ) : (
          active.map((link) => {
            const meta = STATUS_META[link.link_status]
            const Icon = meta.icon
            const checking = checkingIds.has(link.id)
            return (
              <div key={link.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <Icon size={16} className={`${meta.color} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{link.title}</p>
                  <p className="text-xs text-slate-500 truncate">{link.url}</p>
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline shrink-0">
                  {link.last_checked_at ? `Checked ${relativeDate(link.last_checked_at)}` : 'Never checked'}
                </span>
                <button
                  onClick={() => checkOne(link)}
                  disabled={checking}
                  className="text-xs font-semibold text-accent-400 hover:text-accent-300 disabled:opacity-50 shrink-0"
                >
                  {checking ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
