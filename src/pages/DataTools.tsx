import { useMemo, useState } from 'react'
import { Upload, Download, FileJson, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { parseCsv, toCsv, parseBookmarksHtml } from '@/utils/dataFormats'
import { normalizeUrl } from '@/utils/url'
import { guessSourceKey } from '@/utils/source'
import { categoryLabel } from '@/utils/categories'
import { sourceLabel } from '@/utils/source'
import type { useLinks } from '@/hooks/useLinks'
import type { LinkRecord } from '@/types'

type Props = ReturnType<typeof useLinks>

interface ImportRow {
  url: string
  title: string
  description: string
  category: string // resolved category key
  hintResolved: boolean // true if categoryLabelHint matched a real category
  tags: string[]
  isDuplicate: boolean
  selected: boolean
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DataTools({ links, bulkInsertLinks }: Props) {
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()

  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [defaultCategory, setDefaultCategory] = useState(categories[0]?.key ?? '')
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const existingUrls = useMemo(
    () => new Set(links.filter((l) => !l.is_deleted).map((l) => normalizeUrl(l.url))),
    [links]
  )

  function resolveCategory(hint?: string): { key: string; hintResolved: boolean } {
    if (hint) {
      const match = categories.find((c) => c.label.toLowerCase() === hint.toLowerCase())
      if (match) return { key: match.key, hintResolved: true }
    }
    return { key: defaultCategory, hintResolved: false }
  }

  async function handleFile(file: File) {
    setParseError(null)
    setImportResult(null)
    const text = await file.text()
    const name = file.name.toLowerCase()

    try {
      let parsed: ImportRow[] = []

      if (name.endsWith('.json')) {
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : data.links ?? []
        parsed = items
          .filter((item: Record<string, unknown>) => typeof item.url === 'string' && item.url)
          .map((item: Record<string, unknown>) => {
            const url = String(item.url)
            const hint = typeof item.category === 'string' ? item.category : undefined
            const resolved = resolveCategory(hint)
            return {
              url,
              title: typeof item.title === 'string' && item.title ? item.title : url,
              description: typeof item.description === 'string' ? item.description : '',
              category: resolved.key,
              hintResolved: resolved.hintResolved,
              tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
              isDuplicate: existingUrls.has(normalizeUrl(url)),
              selected: !existingUrls.has(normalizeUrl(url)),
            }
          })
      } else if (name.endsWith('.html') || name.endsWith('.htm')) {
        const bookmarks = parseBookmarksHtml(text)
        parsed = bookmarks.map((b) => {
          const resolved = resolveCategory(b.folder)
          return {
            url: b.url,
            title: b.title,
            description: '',
            category: resolved.key,
            hintResolved: resolved.hintResolved,
            tags: [],
            isDuplicate: existingUrls.has(normalizeUrl(b.url)),
            selected: !existingUrls.has(normalizeUrl(b.url)),
          }
        })
      } else {
        // Treat everything else as CSV.
        const records = parseCsv(text)
        parsed = records
          .filter((r) => r.url || r.URL || r.Url)
          .map((r) => {
            const url = r.url || r.URL || r.Url
            const hint = r.category || r.Category
            const tagsRaw = r.tags || r.Tags || ''
            const resolved = resolveCategory(hint)
            return {
              url,
              title: r.title || r.Title || url,
              description: r.description || r.Description || '',
              category: resolved.key,
              hintResolved: resolved.hintResolved,
              tags: tagsRaw ? tagsRaw.split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [],
              isDuplicate: existingUrls.has(normalizeUrl(url)),
              selected: !existingUrls.has(normalizeUrl(url)),
            }
          })
      }

      if (parsed.length === 0) {
        setParseError("Couldn't find any links in that file.")
        return
      }
      setRows(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? `Couldn't parse that file: ${err.message}` : "Couldn't parse that file.")
    }
  }

  function applyDefaultCategoryToUnresolved(newDefault: string) {
    setDefaultCategory(newDefault)
    setRows((prev) => prev?.map((r) => (r.hintResolved ? r : { ...r, category: newDefault })) ?? null)
  }

  async function handleImport() {
    if (!rows) return
    const selected = rows.filter((r) => r.selected)
    if (selected.length === 0) return

    setImporting(true)
    setImportResult(null)
    const { error, insertedCount } = await bulkInsertLinks(
      selected.map((r) => ({
        url: r.url,
        title: r.title,
        description: r.description,
        category: r.category,
        source: guessSourceKey(r.url, sources) ?? 'website',
        tags: r.tags,
      }))
    )
    setImporting(false)

    if (error) {
      setImportResult(`Import failed: ${error}`)
    } else {
      setImportResult(`Imported ${insertedCount} link${insertedCount === 1 ? '' : 's'}.`)
      setRows(null)
    }
  }

  function exportData(format: 'json' | 'csv') {
    const active = links.filter((l) => !l.is_deleted)
    const timestamp = new Date().toISOString().slice(0, 10)

    if (format === 'json') {
      const data = active.map((l) => exportJsonRecord(l))
      downloadBlob(JSON.stringify(data, null, 2), `linkvault-export-${timestamp}.json`, 'application/json')
    } else {
      const headers = ['url', 'title', 'description', 'thumbnail_url', 'category', 'tags', 'notes', 'favorite', 'important', 'created_at']
      const rowsForCsv = active.map((l) => exportCsvRow(l))
      downloadBlob(toCsv(rowsForCsv, headers), `linkvault-export-${timestamp}.csv`, 'text/csv')
    }
  }

  function exportJsonRecord(link: LinkRecord) {
    return {
      url: link.url,
      title: link.title,
      description: link.description,
      thumbnail_url: link.thumbnail_url,
      category: categoryLabel(categories, link.category),
      source: sourceLabel(sources, link.source),
      tags: link.tags,
      notes: link.notes,
      favorite: link.is_favorite,
      important: link.is_important,
      created_at: link.created_at,
    }
  }

  function exportCsvRow(l: LinkRecord): Record<string, string> {
    return {
      url: l.url,
      title: l.title,
      description: l.description ?? '',
      thumbnail_url: l.thumbnail_url ?? '',
      category: categoryLabel(categories, l.category),
      tags: (l.tags ?? []).join(';'),
      notes: l.notes ?? '',
      favorite: l.is_favorite ? 'true' : 'false',
      important: l.is_important ? 'true' : 'false',
      created_at: l.created_at,
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-display font-bold text-white">Import & Export</h2>
        <p className="text-sm text-slate-400 mt-1">Bring in bookmarks from elsewhere, or back up your library.</p>
      </div>

      <section className="bg-base-900 border border-base-700/60 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Upload size={16} className="text-accent-400" /> Import
        </h3>
        <p className="text-xs text-slate-400">
          Supports browser bookmark exports (.html), CSV, or LinkVault JSON exports. Folder names in bookmark
          exports are matched to your existing categories automatically where possible.
        </p>

        <input
          type="file"
          accept=".html,.htm,.csv,.json"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
            file:bg-accent-600 file:text-white file:text-sm file:font-semibold hover:file:bg-accent-500 file:cursor-pointer cursor-pointer"
        />

        {parseError && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <AlertCircle size={15} /> {parseError}
          </p>
        )}

        {importResult && (
          <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <CheckCircle2 size={15} /> {importResult}
          </p>
        )}

        {rows && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 shrink-0">Default category for unmatched rows</label>
              <select
                value={defaultCategory}
                onChange={(e) => applyDefaultCategoryToUnresolved(e.target.value)}
                className="field-input py-1.5 text-sm flex-1"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin border border-base-700 rounded-xl divide-y divide-base-700/60">
              {rows.map((r, i) => (
                <label key={i} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-base-800/50">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={(e) =>
                      setRows((prev) => prev!.map((row, idx) => (idx === i ? { ...row, selected: e.target.checked } : row)))
                    }
                    className="accent-accent-500 w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-200 truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 truncate">{r.url}</p>
                  </div>
                  {r.isDuplicate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 shrink-0">
                      Already saved
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={importing || rows.every((r) => !r.selected)}
              className="flex items-center gap-2 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white
                text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {importing && <Loader2 size={15} className="animate-spin" />}
              Import {rows.filter((r) => r.selected).length} link{rows.filter((r) => r.selected).length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </section>

      <section className="bg-base-900 border border-base-700/60 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Download size={16} className="text-accent-400" /> Export
        </h3>
        <p className="text-xs text-slate-400">
          Download every saved link (excluding Trash) as a backup or to move to another tool.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => exportData('json')}
            className="flex items-center gap-2 bg-base-800 hover:bg-base-700 border border-base-700 text-slate-200
              text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileJson size={16} /> Export as JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="flex items-center gap-2 bg-base-800 hover:bg-base-700 border border-base-700 text-slate-200
              text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileSpreadsheet size={16} /> Export as CSV
          </button>
        </div>
      </section>
    </div>
  )
}
