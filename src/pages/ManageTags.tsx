import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Loader2, Check, X, Tag as TagIcon } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import type { useLinks } from '@/hooks/useLinks'

type Props = ReturnType<typeof useLinks>

export function ManageTags({ links, renameTag, deleteTag }: Props) {
  const navigate = useNavigate()
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const link of links) {
      if (link.is_deleted) continue
      for (const tag of link.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [links])

  function startEdit(tag: string) {
    setEditingTag(tag)
    setEditValue(tag)
    setError(null)
  }

  async function saveEdit(oldTag: string) {
    const trimmed = editValue.trim().toLowerCase()
    if (!trimmed || trimmed === oldTag) {
      setEditingTag(null)
      return
    }
    setSaving(true)
    setError(null)
    const { error: renameError } = await renameTag(oldTag, trimmed)
    setSaving(false)
    if (renameError) setError(renameError)
    else setEditingTag(null)
  }

  async function handleDelete(tag: string) {
    const confirmed = window.confirm(`Remove the tag "${tag}" from all links? This can't be undone.`)
    if (!confirmed) return
    setDeletingTag(tag)
    setError(null)
    const { error: deleteError } = await deleteTag(tag)
    setDeletingTag(null)
    if (deleteError) setError(deleteError)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Manage Tags</h2>
        <p className="text-sm text-slate-400 mt-1">
          Rename a tag to update it everywhere it's used, or delete one to remove it from every link.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
          {error}
        </div>
      )}

      {tagCounts.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No tags yet"
          description="Add tags to your links from the Add Link form or when editing a link — they'll show up here."
        />
      ) : (
        <div className="bg-base-900 border border-base-700/60 rounded-2xl divide-y divide-base-700/60">
          {tagCounts.map(([tag, count]) => (
            <div key={tag} className="flex items-center gap-3 px-4 sm:px-5 py-3">
              {editingTag === tag ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(tag)}
                    className="field-input flex-1 py-1.5"
                  />
                  <button
                    onClick={() => saveEdit(tag)}
                    disabled={saving}
                    className="p-2 text-emerald-400 hover:bg-base-800 rounded-lg"
                    aria-label="Save"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => setEditingTag(null)}
                    className="p-2 text-slate-400 hover:bg-base-800 rounded-lg"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate(`/links?tag=${encodeURIComponent(tag)}`)}
                    className="flex-1 text-left text-sm font-medium text-slate-100 hover:text-accent-300 transition-colors"
                  >
                    #{tag}
                  </button>
                  <span className="text-xs text-slate-500 bg-base-800 rounded-full px-2 py-0.5">{count}</span>
                  <button
                    onClick={() => startEdit(tag)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-base-800 rounded-lg"
                    aria-label={`Rename ${tag}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    disabled={deletingTag === tag}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-base-800 rounded-lg"
                    aria-label={`Delete ${tag}`}
                  >
                    {deletingTag === tag ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
