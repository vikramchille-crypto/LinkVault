import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeUrl } from '@/utils/url'
import type { LinkFormInput, LinkRecord } from '@/types'

interface AddLinkResult {
  error: string | null
  // Set when a link with the same URL already exists and `force` wasn't
  // passed — the caller (AddLinkModal) shows a confirm panel and can retry
  // with `force: true` to save anyway.
  duplicate?: LinkRecord
}

interface UseLinksResult {
  links: LinkRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addLink: (input: LinkFormInput, options?: { force?: boolean }) => Promise<AddLinkResult>
  updateLink: (id: string, input: Partial<LinkFormInput>) => Promise<{ error: string | null }>
  toggleFavorite: (link: LinkRecord) => Promise<void>
  toggleImportant: (link: LinkRecord) => Promise<void>
  archiveLink: (link: LinkRecord, archived: boolean) => Promise<void>
  softDeleteLink: (link: LinkRecord) => Promise<void>
  restoreLink: (link: LinkRecord) => Promise<void>
  permanentlyDeleteLink: (id: string) => Promise<void>
  registerView: (link: LinkRecord) => Promise<void>
  renameTag: (oldTag: string, newTag: string) => Promise<{ error: string | null }>
  deleteTag: (tag: string) => Promise<{ error: string | null }>
  checkLinkStatus: (link: LinkRecord) => Promise<void>
  bulkInsertLinks: (
    rows: Array<Partial<LinkFormInput> & { url: string; title: string }>
  ) => Promise<{ error: string | null; insertedCount: number }>
}

// Single source of truth for the user's links. Every page (Dashboard, All
// Links, Favorites, ...) reads from this hook and filters/sorts client-side,
// which keeps the data-fetching logic in one modular place.
export function useLinks(): UseLinksResult {
  const { user } = useAuth()
  const [links, setLinks] = useState<LinkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setLinks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setLinks((data ?? []) as LinkRecord[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addLink(input: LinkFormInput, options?: { force?: boolean }): Promise<AddLinkResult> {
    if (!user) return { error: 'Not signed in' }

    if (!options?.force) {
      const normalized = normalizeUrl(input.url)
      const existing = links.find((l) => !l.is_deleted && normalizeUrl(l.url) === normalized)
      if (existing) return { error: null, duplicate: existing }
    }

    const { data, error: insertError } = await supabase
      .from('links')
      .insert({
        user_id: user.id,
        url: input.url,
        title: input.title || input.url,
        description: input.description || null,
        notes: input.notes || null,
        thumbnail_url: input.thumbnail_url || null,
        source: input.source,
        category: input.category,
        tags: input.tags,
        is_favorite: input.is_favorite,
        is_important: input.is_important,
        is_archived: false,
        is_deleted: false,
        view_count: 0,
      })
      .select()
      .single()

    if (insertError) return { error: insertError.message }
    if (data) setLinks((prev) => [data as LinkRecord, ...prev])
    return { error: null }
  }

  async function updateLink(id: string, input: Partial<LinkFormInput>) {
    const patch: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() }

    const { data, error: updateError } = await supabase
      .from('links')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return { error: updateError.message }
    if (data) setLinks((prev) => prev.map((l) => (l.id === id ? (data as LinkRecord) : l)))
    return { error: null }
  }

  async function patchAndSync(link: LinkRecord, patch: Partial<LinkRecord>) {
    const { data, error: updateError } = await supabase
      .from('links')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', link.id)
      .select()
      .single()

    if (!updateError && data) {
      setLinks((prev) => prev.map((l) => (l.id === link.id ? (data as LinkRecord) : l)))
    }
  }

  const toggleFavorite = (link: LinkRecord) => patchAndSync(link, { is_favorite: !link.is_favorite })
  const toggleImportant = (link: LinkRecord) => patchAndSync(link, { is_important: !link.is_important })
  const archiveLink = (link: LinkRecord, archived: boolean) => patchAndSync(link, { is_archived: archived })
  const softDeleteLink = (link: LinkRecord) => patchAndSync(link, { is_deleted: true })
  const restoreLink = (link: LinkRecord) => patchAndSync(link, { is_deleted: false })

  async function permanentlyDeleteLink(id: string) {
    const { error: deleteError } = await supabase.from('links').delete().eq('id', id)
    if (!deleteError) setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  async function registerView(link: LinkRecord) {
    await patchAndSync(link, { view_count: link.view_count + 1, last_opened_at: new Date().toISOString() })
  }

  // Tags aren't a separate table — they're just a text[] column on each
  // link — so renaming/deleting a tag "everywhere" means updating every
  // link that currently has it. Fine at personal-library scale.
  async function renameTag(oldTag: string, newTag: string) {
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed) return { error: 'New tag name is required.' }

    const affected = links.filter((l) => (l.tags ?? []).includes(oldTag))
    const results = await Promise.all(
      affected.map((l) => {
        const nextTags = Array.from(new Set(l.tags.map((t) => (t === oldTag ? trimmed : t))))
        return supabase.from('links').update({ tags: nextTags }).eq('id', l.id).select().single()
      })
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) return { error: failed.error.message }

    setLinks((prev) =>
      prev.map((l) => {
        const updated = results.find((r) => r.data && (r.data as LinkRecord).id === l.id)
        return updated?.data ? (updated.data as LinkRecord) : l
      })
    )
    return { error: null }
  }

  async function deleteTag(tag: string) {
    const affected = links.filter((l) => (l.tags ?? []).includes(tag))
    const results = await Promise.all(
      affected.map((l) => {
        const nextTags = l.tags.filter((t) => t !== tag)
        return supabase.from('links').update({ tags: nextTags }).eq('id', l.id).select().single()
      })
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) return { error: failed.error.message }

    setLinks((prev) =>
      prev.map((l) => {
        const updated = results.find((r) => r.data && (r.data as LinkRecord).id === l.id)
        return updated?.data ? (updated.data as LinkRecord) : l
      })
    )
    return { error: null }
  }

  async function checkLinkStatus(link: LinkRecord) {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-link', {
        body: { url: link.url },
      })
      if (fnError || !data) return
      await patchAndSync(link, {
        link_status: (data.status as LinkRecord['link_status']) ?? 'unknown',
        last_checked_at: new Date().toISOString(),
      })
    } catch {
      // Silently leave status as-is — link health checks are best-effort
      // and must never block or break the rest of the app.
    }
  }

  // Used by the Import feature: inserts many rows in one round trip rather
  // than one addLink() call per row. Deliberately bypasses the duplicate
  // check (Import has its own dedupe UI before calling this).
  async function bulkInsertLinks(rows: Array<Partial<LinkFormInput> & { url: string; title: string }>) {
    if (!user) return { error: 'Not signed in', insertedCount: 0 }
    if (rows.length === 0) return { error: null, insertedCount: 0 }

    const payload = rows.map((r) => ({
      user_id: user.id,
      url: r.url,
      title: r.title || r.url,
      description: r.description || null,
      notes: r.notes || null,
      thumbnail_url: r.thumbnail_url || null,
      source: r.source || 'website',
      category: r.category || 'uncategorized',
      tags: r.tags || [],
      is_favorite: r.is_favorite ?? false,
      is_important: r.is_important ?? false,
      is_archived: false,
      is_deleted: false,
      view_count: 0,
    }))

    // Chunk to keep individual requests reasonably sized.
    const CHUNK_SIZE = 200
    let insertedCount = 0
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE)
      const { data, error: insertError } = await supabase.from('links').insert(chunk).select()
      if (insertError) return { error: insertError.message, insertedCount }
      if (data) {
        insertedCount += data.length
        setLinks((prev) => [...(data as LinkRecord[]), ...prev])
      }
    }

    return { error: null, insertedCount }
  }

  return {
    links,
    loading,
    error,
    refresh,
    addLink,
    updateLink,
    toggleFavorite,
    toggleImportant,
    archiveLink,
    softDeleteLink,
    restoreLink,
    permanentlyDeleteLink,
    registerView,
    renameTag,
    deleteTag,
    checkLinkStatus,
    bulkInsertLinks,
  }
}
