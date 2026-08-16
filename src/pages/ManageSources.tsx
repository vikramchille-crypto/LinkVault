import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Loader2, Check, X, Lock } from 'lucide-react'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import type { SourceRecord } from '@/types'

const ICON_SUGGESTIONS = ['▶️', '📘', '📸', '🌐', '🐦', '💼', '🎵', '👻', '📌', '🧵', '💻', '🔗']

export function ManageSources() {
  const { sources, loading, error, refresh, addSource, updateSource, deleteSource } = useSourcesContext()

  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('🔗')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) {
      setAddError('Enter a source name.')
      return
    }
    setAdding(true)
    setAddError(null)
    const { error: addErr } = await addSource(newLabel, newIcon)
    setAdding(false)
    if (addErr) {
      setAddError(addErr)
    } else {
      setNewLabel('')
      setNewIcon('🔗')
    }
  }

  function startEdit(s: SourceRecord) {
    setEditingId(s.id)
    setEditLabel(s.label)
    setEditIcon(s.icon)
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim()) return
    setSavingEdit(true)
    const { error: editErr } = await updateSource(id, { label: editLabel.trim(), icon: editIcon })
    setSavingEdit(false)
    if (!editErr) setEditingId(null)
  }

  async function handleDelete(s: SourceRecord) {
    const confirmed = window.confirm(
      `Delete "${s.label}"? Any links from this source will be moved to Website.`
    )
    if (!confirmed) return

    setDeletingId(s.id)
    setNotice(null)
    const { error: delErr, reassignedCount } = await deleteSource(s)
    setDeletingId(null)

    if (delErr) {
      setNotice(delErr)
    } else if (reassignedCount > 0) {
      setNotice(`Deleted "${s.label}". ${reassignedCount} link${reassignedCount === 1 ? '' : 's'} moved to Website.`)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Manage Sources</h2>
        <p className="text-sm text-slate-400 mt-1">
          Sources are the top-level grouping for your links (YouTube, Facebook, Instagram, Website...).
          Add, rename, or remove the ones you use.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <LoadingGrid count={4} />
      ) : (
        <>
          <form onSubmit={handleAdd} className="bg-base-900 border border-base-700/60 rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Add a source</p>
            {addError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-3">
                {addError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="field-input w-20 text-center"
                  aria-label="Icon"
                >
                  {ICON_SUGGESTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="e.g. LinkedIn, TikTok, Pinterest"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="field-input flex-1 sm:w-64"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500 disabled:opacity-60
                  text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0"
              >
                {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />}
                Add Source
              </button>
            </div>
          </form>

          {notice && (
            <div className="text-sm text-slate-300 bg-base-800 border border-base-700 rounded-xl px-3.5 py-2.5">
              {notice}
            </div>
          )}

          <div className="bg-base-900 border border-base-700/60 rounded-2xl divide-y divide-base-700/60">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                {editingId === s.id ? (
                  <>
                    <select
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="field-input w-16 text-center py-1.5"
                      aria-label="Icon"
                    >
                      {ICON_SUGGESTIONS.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                    <input
                      autoFocus
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="field-input flex-1 py-1.5"
                    />
                    <button
                      onClick={() => saveEdit(s.id)}
                      disabled={savingEdit}
                      className="p-2 text-emerald-400 hover:bg-base-800 rounded-lg"
                      aria-label="Save"
                    >
                      {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-slate-400 hover:bg-base-800 rounded-lg"
                      aria-label="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xl w-8 text-center">{s.icon}</span>
                    <span className="flex-1 text-sm font-medium text-slate-100">{s.label}</span>
                    {s.is_system ? (
                      <span className="flex items-center gap-1 text-xs text-slate-500 px-2 py-1">
                        <Lock size={12} /> Protected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-base-800 rounded-lg"
                          aria-label={`Rename ${s.label}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-base-800 rounded-lg"
                          aria-label={`Delete ${s.label}`}
                        >
                          {deletingId === s.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
