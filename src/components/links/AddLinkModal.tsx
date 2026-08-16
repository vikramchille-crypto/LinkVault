import { useEffect, useState, type FormEvent } from 'react'
import { X, Star, Flag, Loader2, ImageOff, RefreshCw, AlertCircle, Sparkles, Check } from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { guessSourceKey } from '@/utils/source'
import { fetchLinkPreview } from '@/utils/linkPreview'
import { suggestCategorization, type CategorySuggestion } from '@/utils/aiSuggest'
import type { LinkFormInput, LinkRecord } from '@/types'

interface SubmitResult {
  error: string | null
  duplicate?: LinkRecord
}

interface AddLinkModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: LinkFormInput, options?: { force?: boolean }) => Promise<SubmitResult>
  editingLink?: LinkRecord | null
  allTags?: string[]
  // Pre-fills a brand-new link, e.g. from the Android Share flow (shared
  // url/title land here). Ignored when editingLink is set.
  initialValues?: Partial<LinkFormInput>
}

const EMPTY_FORM: LinkFormInput = {
  url: '',
  title: '',
  description: '',
  notes: '',
  thumbnail_url: '',
  category: '',
  source: '',
  tags: [],
  is_favorite: false,
  is_important: false,
}

export function AddLinkModal({ open, onClose, onSubmit, editingLink, allTags = [], initialValues }: AddLinkModalProps) {
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const [form, setForm] = useState<LinkFormInput>(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceTouched, setSourceTouched] = useState(false)
  const [sourceEditing, setSourceEditing] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lastAutoFetchedUrl, setLastAutoFetchedUrl] = useState<string | null>(null)
  const [duplicateLink, setDuplicateLink] = useState<LinkRecord | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>(null)

  // Resets the form ONLY when the modal is opened/closed or switches between
  // add/edit mode. Deliberately does NOT depend on `categories`/`sources` —
  // those arrays get a new reference any time Supabase silently refreshes
  // the auth session in the background (e.g. when you switch browser tabs
  // and come back), which would otherwise wipe out whatever you were mid-
  // typing. See the separate effect below for filling in sensible defaults
  // once those lists load, without ever overwriting existing input.
  useEffect(() => {
    if (!open) return
    if (editingLink) {
      setForm({
        url: editingLink.url,
        title: editingLink.title,
        description: editingLink.description ?? '',
        notes: editingLink.notes ?? '',
        thumbnail_url: editingLink.thumbnail_url ?? '',
        category: editingLink.category,
        source: editingLink.source,
        tags: editingLink.tags ?? [],
        is_favorite: editingLink.is_favorite,
        is_important: editingLink.is_important,
      })
      setSourceTouched(true)
      setSourceEditing(false)
    } else {
      setForm({ ...EMPTY_FORM, ...initialValues })
      setSourceTouched(false)
      setSourceEditing(false)
    }
    setError(null)
    setTagInput('')
    setPreviewError(null)
    setLastAutoFetchedUrl(null)
    setDuplicateLink(null)
    setAiSuggestion(null)
    setAiError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingLink])

  // Fills in a default category once the list has loaded, but only if the
  // field is still empty — never clobbers something the user already typed
  // or picked.
  useEffect(() => {
    if (!open || editingLink) return
    setForm((f) => (f.category ? f : { ...f, category: categories[0]?.key ?? '' }))
  }, [categories, open, editingLink])

  // Auto-suggests a source from the pasted URL (only before the user has
  // manually touched the Source field, and only once sources have loaded).
  useEffect(() => {
    if (!open || editingLink || sourceTouched || sources.length === 0 || !form.url.trim()) return
    const guessed = guessSourceKey(form.url, sources)
    if (guessed) setForm((f) => ({ ...f, source: guessed }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, sources, open, editingLink, sourceTouched])

  async function runPreviewFetch(url: string, { force = false } = {}) {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (!force && lastAutoFetchedUrl === parsed.href) return

    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const preview = await fetchLinkPreview(parsed.href)
      setLastAutoFetchedUrl(parsed.href)
      if (preview) {
        setForm((f) => ({
          ...f,
          title: force || !f.title ? preview.title || f.title : f.title,
          thumbnail_url: force || !f.thumbnail_url ? preview.image || f.thumbnail_url : f.thumbnail_url,
          description: force || !f.description ? preview.description || f.description : f.description,
        }))
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Couldn't fetch a preview.")
    } finally {
      setPreviewLoading(false)
    }
  }

  // Debounced auto-fetch: only for brand-new links, only once per URL value,
  // and only fills fields that are still empty (never overwrites anything
  // the user has already typed).
  useEffect(() => {
    if (!open || editingLink || !form.url.trim()) return
    const timer = setTimeout(() => runPreviewFetch(form.url), 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, open, editingLink])

  if (!open) return null

  const currentSource = sources.find((s) => s.key === form.source) ?? null

  function addTag() {
    const value = tagInput.trim().toLowerCase()
    if (value && !form.tags.includes(value)) {
      setForm((f) => ({ ...f, tags: [...f.tags, value] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  async function runAiSuggest() {
    if (!form.url.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiSuggestion(null)
    try {
      const suggestion = await suggestCategorization({
        url: form.url,
        title: form.title,
        description: form.description,
        existingCategories: categories.map((c) => c.label),
        existingTags: allTags,
      })
      setAiSuggestion(suggestion)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI suggestion failed.')
    } finally {
      setAiLoading(false)
    }
  }

  function acceptAiSuggestion() {
    if (!aiSuggestion) return
    const matchedCategory = categories.find(
      (c) => c.label.toLowerCase() === aiSuggestion.category.toLowerCase()
    )
    setForm((f) => ({
      ...f,
      category: matchedCategory?.key ?? f.category,
      tags: Array.from(new Set([...f.tags, ...aiSuggestion.tags])),
    }))
    setAiSuggestion(null)
  }

  async function submit(options?: { force?: boolean }) {
    setSubmitting(true)
    setError(null)
    const result = await onSubmit(form, options)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else if (result.duplicate) {
      setDuplicateLink(result.duplicate)
    } else {
      onClose()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) {
      setError('URL is required.')
      return
    }
    try {
      new URL(form.url)
    } catch {
      setError('Please enter a valid URL, including https://')
      return
    }
    await submit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-lg bg-base-900 border border-base-700 sm:rounded-2xl rounded-t-2xl
          shadow-card-hover max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-700/60 sticky top-0 bg-base-900 z-10">
          <h2 className="text-base font-display font-bold text-white">
            {editingLink ? 'Edit Link' : 'Add New Link'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          {duplicateLink && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 space-y-2.5">
              <p className="text-sm text-amber-200 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                This link is already in your library — saved as "{duplicateLink.title}".
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.open(duplicateLink.url, '_blank', 'noopener,noreferrer')
                    onClose()
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-base-800 text-slate-200 hover:bg-base-700 transition-colors"
                >
                  Open Existing
                </button>
                <button
                  type="button"
                  onClick={() => submit({ force: true })}
                  disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-colors disabled:opacity-60"
                >
                  Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateLink(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="field-label">
              URL <span className="text-accent-400">*</span>
            </label>
            <input
              autoFocus
              type="url"
              required
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              className="field-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Source</label>
              {sourceEditing || sources.length === 0 ? null : (
                <button
                  type="button"
                  onClick={() => setSourceEditing(true)}
                  className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            {sourceEditing || sources.length === 0 ? (
              <select
                autoFocus
                value={form.source}
                onChange={(e) => {
                  setSourceTouched(true)
                  setForm((f) => ({ ...f, source: e.target.value }))
                  setSourceEditing(false)
                }}
                onBlur={() => setSourceEditing(false)}
                className="field-input"
              >
                {sources.length === 0 && <option value="">No sources yet</option>}
                {sources.map((s) => (
                  <option key={s.id} value={s.key}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 bg-base-800 border border-base-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200">
                {currentSource ? (
                  <>
                    <span>{currentSource.icon}</span>
                    {currentSource.label}
                    <span className="text-xs text-slate-500 ml-1">— detected automatically</span>
                  </>
                ) : (
                  <span className="text-slate-500">Paste a URL to detect the source</span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-base-700 bg-base-800/50 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent-400" />
                Optional: let AI suggest a category and tags
              </p>
              <button
                type="button"
                onClick={runAiSuggest}
                disabled={aiLoading || !form.url.trim()}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Suggest
              </button>
            </div>

            {aiError && <p className="text-xs text-amber-400 mt-2">{aiError}</p>}

            {aiSuggestion && (
              <div className="mt-2.5 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500">Category:</span>
                  <span className="px-2 py-0.5 rounded-md bg-base-900 text-slate-200">
                    {aiSuggestion.category}
                    {aiSuggestion.isNewCategory &&
                      !categories.some((c) => c.label.toLowerCase() === aiSuggestion.category.toLowerCase()) &&
                      ' (new)'}
                  </span>
                </div>
                {aiSuggestion.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Tags:</span>
                    {aiSuggestion.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-base-900 text-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={acceptAiSuggestion}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-colors"
                  >
                    <Check size={12} /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="field-label">
              Category <span className="text-accent-400">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="field-input"
            >
              {categories.length === 0 && <option value="">No categories yet</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Title</label>
            <input
              type="text"
              placeholder="Auto-fetched from the URL, or type your own"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              rows={2}
              placeholder="Auto-fetched from the URL, or edit freely"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="field-input resize-none"
            />
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea
              rows={2}
              placeholder='Your own notes — e.g. "Good idea for my business"'
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="field-input resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Thumbnail</label>
              <button
                type="button"
                onClick={() => runPreviewFetch(form.url, { force: true })}
                disabled={previewLoading || !form.url.trim()}
                className="flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {previewLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {form.thumbnail_url ? 'Refetch preview' : 'Fetch preview'}
              </button>
            </div>

            <div className="flex gap-3">
              <div className="w-24 h-16 shrink-0 rounded-xl bg-base-800 border border-base-700 overflow-hidden flex items-center justify-center">
                {previewLoading ? (
                  <Loader2 size={18} className="animate-spin text-slate-500" />
                ) : form.thumbnail_url ? (
                  <img
                    src={form.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <ImageOff size={18} className="text-slate-600" />
                )}
              </div>
              <input
                type="url"
                placeholder="Auto-fetched from the URL, or paste your own image link"
                value={form.thumbnail_url}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                className="field-input flex-1"
              />
            </div>
            {previewError && <p className="text-xs text-amber-400 mt-1.5">{previewError}</p>}
          </div>

          <div>
            <label className="field-label">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs bg-base-800 text-slate-300 px-2 py-1 rounded-lg"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-slate-500 hover:text-white">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag()
                }
              }}
              className="field-input"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_favorite}
                onChange={(e) => setForm((f) => ({ ...f, is_favorite: e.target.checked }))}
                className="accent-accent-500 w-4 h-4"
              />
              <Star size={15} className={form.is_favorite ? 'fill-accent-400 text-accent-400' : ''} />
              Favorite
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_important}
                onChange={(e) => setForm((f) => ({ ...f, is_important: e.target.checked }))}
                className="accent-accent-500 w-4 h-4"
              />
              <Flag size={15} className={form.is_important ? 'fill-accent-400 text-accent-400' : ''} />
              Important
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-700/60 sticky bottom-0 bg-base-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-60
              text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {editingLink ? 'Save Changes' : 'Save Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
