import { LinkCard } from './LinkCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { LinkRecord, ViewMode } from '@/types'

interface LinkGridProps {
  links: LinkRecord[]
  view?: ViewMode
  emptyTitle: string
  emptyDescription: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  onOpen: (link: LinkRecord) => void
  onEdit: (link: LinkRecord) => void
  onToggleFavorite: (link: LinkRecord) => void
  onToggleImportant: (link: LinkRecord) => void
  onArchive: (link: LinkRecord, archived: boolean) => void
  onDelete: (link: LinkRecord) => void
  onRestore?: (link: LinkRecord) => void
  onPermanentDelete?: (link: LinkRecord) => void
}

export function LinkGrid({
  links,
  view = 'grid',
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  ...actions
}: LinkGridProps) {
  if (links.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }

  return (
    <div
      className={
        view === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'flex flex-col gap-2.5'
      }
    >
      {links.map((link) => (
        <LinkCard key={link.id} link={link} view={view} {...actions} />
      ))}
    </div>
  )
}
