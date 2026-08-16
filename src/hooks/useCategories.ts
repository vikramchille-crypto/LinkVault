import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_SEED_CATEGORIES } from '@/utils/categories'
import { uniqueSlug } from '@/utils/slugify'
import type { CategoryRecord } from '@/types'

interface UseCategoriesResult {
  categories: CategoryRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addCategory: (label: string, emoji: string) => Promise<{ error: string | null }>
  updateCategory: (id: string, patch: { label?: string; emoji?: string }) => Promise<{ error: string | null }>
  // Deletes a category. If any links still use it, they are first
  // reassigned to the protected "Uncategorized" fallback so nothing is lost.
  deleteCategory: (category: CategoryRecord) => Promise<{ error: string | null; reassignedCount: number }>
}

export function useCategories(): UseCategoriesResult {
  const { user } = useAuth()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      // First time this user has loaded the app — seed their default set.
      const { data: seeded, error: seedError } = await supabase
        .from('categories')
        .insert(DEFAULT_SEED_CATEGORIES.map((c) => ({ ...c, user_id: user.id })))
        .select()

      if (seedError) {
        setError(seedError.message)
      } else {
        setCategories(((seeded ?? []) as CategoryRecord[]).sort((a, b) => a.sort_order - b.sort_order))
      }
    } else {
      setCategories(data as CategoryRecord[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addCategory(label: string, emoji: string) {
    if (!user) return { error: 'Not signed in' }
    const trimmed = label.trim()
    if (!trimmed) return { error: 'Category name is required.' }

    const key = uniqueSlug(trimmed, categories.map((c) => c.key))
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        key,
        label: trimmed,
        emoji: emoji || '🔗',
        sort_order: nextSortOrder,
        is_system: false,
      })
      .select()
      .single()

    if (insertError) return { error: insertError.message }
    if (data) setCategories((prev) => [...prev, data as CategoryRecord].sort((a, b) => a.sort_order - b.sort_order))
    return { error: null }
  }

  async function updateCategory(id: string, patch: { label?: string; emoji?: string }) {
    const { data, error: updateError } = await supabase
      .from('categories')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return { error: updateError.message }
    if (data) setCategories((prev) => prev.map((c) => (c.id === id ? (data as CategoryRecord) : c)))
    return { error: null }
  }

  async function deleteCategory(category: CategoryRecord) {
    if (category.is_system) return { error: "This category can't be deleted.", reassignedCount: 0 }
    if (!user) return { error: 'Not signed in', reassignedCount: 0 }

    // Reassign any links pointing at this category to "Uncategorized" first,
    // so the delete never orphans (or silently loses) a saved link.
    const fallback = categories.find((c) => c.key === 'uncategorized')
    let reassignedCount = 0

    if (fallback) {
      const { data: affected, error: reassignError } = await supabase
        .from('links')
        .update({ category: fallback.key })
        .eq('user_id', user.id)
        .eq('category', category.key)
        .select('id')

      if (reassignError) return { error: reassignError.message, reassignedCount: 0 }
      reassignedCount = affected?.length ?? 0
    }

    const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id)
    if (deleteError) return { error: deleteError.message, reassignedCount }

    setCategories((prev) => prev.filter((c) => c.id !== category.id))
    return { error: null, reassignedCount }
  }

  return { categories, loading, error, refresh, addCategory, updateCategory, deleteCategory }
}
