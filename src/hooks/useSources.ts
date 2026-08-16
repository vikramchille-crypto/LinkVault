import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_SEED_SOURCES } from '@/utils/source'
import { uniqueSlug } from '@/utils/slugify'
import type { SourceRecord } from '@/types'

interface UseSourcesResult {
  sources: SourceRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addSource: (label: string, icon: string) => Promise<{ error: string | null }>
  updateSource: (id: string, patch: { label?: string; icon?: string }) => Promise<{ error: string | null }>
  // Deletes a source. Any links still using it are first reassigned to the
  // protected "Website" fallback so nothing is lost.
  deleteSource: (source: SourceRecord) => Promise<{ error: string | null; reassignedCount: number }>
}

export function useSources(): UseSourcesResult {
  const { user } = useAuth()
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setSources([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('sources')
      .select('*')
      .order('sort_order', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      const { data: seeded, error: seedError } = await supabase
        .from('sources')
        .insert(DEFAULT_SEED_SOURCES.map((s) => ({ ...s, user_id: user.id })))
        .select()

      if (seedError) {
        setError(seedError.message)
      } else {
        setSources(((seeded ?? []) as SourceRecord[]).sort((a, b) => a.sort_order - b.sort_order))
      }
    } else {
      setSources(data as SourceRecord[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addSource(label: string, icon: string) {
    if (!user) return { error: 'Not signed in' }
    const trimmed = label.trim()
    if (!trimmed) return { error: 'Source name is required.' }

    const key = uniqueSlug(trimmed, sources.map((s) => s.key))
    const nextSortOrder = sources.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1

    const { data, error: insertError } = await supabase
      .from('sources')
      .insert({
        user_id: user.id,
        key,
        label: trimmed,
        icon: icon || '🔗',
        sort_order: nextSortOrder,
        is_system: false,
      })
      .select()
      .single()

    if (insertError) return { error: insertError.message }
    if (data) setSources((prev) => [...prev, data as SourceRecord].sort((a, b) => a.sort_order - b.sort_order))
    return { error: null }
  }

  async function updateSource(id: string, patch: { label?: string; icon?: string }) {
    const { data, error: updateError } = await supabase
      .from('sources')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return { error: updateError.message }
    if (data) setSources((prev) => prev.map((s) => (s.id === id ? (data as SourceRecord) : s)))
    return { error: null }
  }

  async function deleteSource(source: SourceRecord) {
    if (source.is_system) return { error: "This source can't be deleted.", reassignedCount: 0 }
    if (!user) return { error: 'Not signed in', reassignedCount: 0 }

    const fallback = sources.find((s) => s.key === 'website')
    let reassignedCount = 0

    if (fallback) {
      const { data: affected, error: reassignError } = await supabase
        .from('links')
        .update({ source: fallback.key })
        .eq('user_id', user.id)
        .eq('source', source.key)
        .select('id')

      if (reassignError) return { error: reassignError.message, reassignedCount: 0 }
      reassignedCount = affected?.length ?? 0
    }

    const { error: deleteError } = await supabase.from('sources').delete().eq('id', source.id)
    if (deleteError) return { error: deleteError.message, reassignedCount }

    setSources((prev) => prev.filter((s) => s.id !== source.id))
    return { error: null, reassignedCount }
  }

  return { sources, loading, error, refresh, addSource, updateSource, deleteSource }
}
