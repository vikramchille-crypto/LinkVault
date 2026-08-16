import { useState } from 'react'
import type { ViewMode } from '@/types'

const STORAGE_KEY = 'linkvault-view-mode'

// Remembers grid vs list across page loads. Shared by AllLinks and every
// SimpleLinksPage (Favorites, Recent, Important, Archive, Trash) so picking
// list view once applies everywhere.
export function usePersistedViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [view, setViewState] = useState<ViewMode>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  })

  function setView(mode: ViewMode) {
    setViewState(mode)
    window.localStorage.setItem(STORAGE_KEY, mode)
  }

  return [view, setView]
}
