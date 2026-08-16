import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Loader2, Check, X, Lock } from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { LoadingGrid } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import type { CategoryRecord } from '@/types'

const EMOJI_SUGGESTIONS = ['💼', '🩺', '🙏', '🤖', '🌱', '📱', '💰', '📚', '🎯', '🎨', '🍳', '✈️', '🎮', '🏠', '⚡', '📁']

export function ManageCategories() {
  const { categories, loading, error, refresh, addCategory, updateCategory, deleteCategory } = useCategoriesContext()

  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔗')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) {
      setAddError('Enter a category name.')
      return
    }
    setAdding(true)
    setAddError(null)
    const { error: addErr } = await addCategory(newLabel, newEmoji)
    setAdding(false)
    if (addErr) {
      setAddError(addErr)
    } else {
      setNewLabel('')
      setNewEmoji('🔗')
    }
  }

  function startEdit(c: CategoryRecord) {
    setEditingId(c.id)
    setEditLabel(c.label)
    setEditEmoji(c.emoji)
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim()) return
    setSavingEdit(true)
    const { error: editErr } = await updateCategory(id, { label: editLabel.trim(), emoji: editEmoji })
    setSavingEdit(false)
    if (!editErr) setEditingId(null)
  }

  async function handleDelete(c: CategoryRecord) {
    const confirmed = window.confirm(
      `Delete "${c.label}"? Any links in this category will be moved to Uncategorized.`
    )
    if (!confirmed) return

    setDeletingId(c.id)
    setNotice(null)
    const { error: delErr, reassignedCount } = await deleteCategory(c)
    setDeletingId(null)

    if (delErr) {
      setNotice(delErr)
    } else if (reassignedCount > 0) {
      setNotice(`Deleted "${c.label}". ${reassignedCount} link${reassignedCount === 1 ? '' : 's'} moved to Uncategorized.`)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Manage Categories</h2>
        <p className="text-sm text-slate-400 mt-1">
          Add new categories, rename existing ones, or remove ones you no longer need.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <LoadingGrid count={4} />
      ) : (
        <>
          <form onSubmit={handleAdd} className="bg-base-900 border border-base-700/60 rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Add a category</p>
            {addError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-3">
                {addError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <select
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="field-input w-20 text-center"
                  aria-label="Emoji"
                >
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="e.g. Travel, Recipes, Music"
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
                Add Category
              </button>
            </div>
          </form>

          {notice && (
            <div className="text-sm text-slate-300 bg-base-800 border border-base-700 rounded-xl px-3.5 py-2.5">
              {notice}
            </div>
          )}

          <div className="bg-base-900 border border-base-700/60 rounded-2xl divide-y divide-base-700/60">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                {editingId === c.id ? (
                  <>
                    <select
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="field-input w-16 text-center py-1.5"
                      aria-label="Emoji"
                    >
                      {EMOJI_SUGGESTIONS.map((e) => (
                        <option key={e} value={e}>
                          {e}
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
                      onClick={() => saveEdit(c.id)}
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
                    <span className="text-xl w-8 text-center">{c.emoji}</span>
                    <span className="flex-1 text-sm font-medium text-slate-100">{c.label}</span>
                    {c.is_system ? (
                      <span className="flex items-center gap-1 text-xs text-slate-500 px-2 py-1">
                        <Lock size={12} /> Protected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(c)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-base-800 rounded-lg"
                          aria-label={`Rename ${c.label}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-base-800 rounded-lg"
                          aria-label={`Delete ${c.label}`}
                        >
                          {deletingId === c.id ? (
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
