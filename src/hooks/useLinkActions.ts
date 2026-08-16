import { useState } from 'react'
import type { useLinks } from './useLinks'
import type { LinkRecord } from '@/types'

// Wraps the raw useLinks() mutators with the concerns every page needs:
// opening a link in a new tab (and counting the view), and tracking which
// link is currently being edited so a single AddLinkModal instance can be
// reused in "edit" mode.
export function useLinkActions(linksState: ReturnType<typeof useLinks>) {
  const [editingLink, setEditingLink] = useState<LinkRecord | null>(null)

  function onOpen(link: LinkRecord) {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    linksState.registerView(link)
  }

  function onEdit(link: LinkRecord) {
    setEditingLink(link)
  }

  return {
    onOpen,
    onEdit,
    onToggleFavorite: linksState.toggleFavorite,
    onToggleImportant: linksState.toggleImportant,
    onArchive: linksState.archiveLink,
    onDelete: linksState.softDeleteLink,
    onRestore: linksState.restoreLink,
    onPermanentDelete: (link: LinkRecord) => linksState.permanentlyDeleteLink(link.id),
    editingLink,
    closeEdit: () => setEditingLink(null),
  }
}
