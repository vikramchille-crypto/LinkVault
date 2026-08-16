import { Star, MoreVertical, Flag, Archive, Trash2, Pencil, ExternalLink, ArchiveRestore, Eye } from 'lucide-react'
import { categoryEmoji, categoryLabel } from '@/utils/categories'
import { sourceLabel, relativeDate } from '@/utils/source'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import { CardMenu } from './CardMenu'
import type { LinkRecord } from '@/types'

interface LinkCardProps {
  link: LinkRecord
  view?: 'grid' | 'list'
  onOpen: (link: LinkRecord) => void
  onEdit: (link: LinkRecord) => void
  onToggleFavorite: (link: LinkRecord) => void
  onToggleImportant: (link: LinkRecord) => void
  onArchive: (link: LinkRecord, archived: boolean) => void
  onDelete: (link: LinkRecord) => void
  onRestore?: (link: LinkRecord) => void
  onPermanentDelete?: (link: LinkRecord) => void
}

const MAX_VISIBLE_TAGS = 3

export function LinkCard({
  link,
  view = 'grid',
  onOpen,
  onEdit,
  onToggleFavorite,
  onToggleImportant,
  onArchive,
  onDelete,
  onRestore,
  onPermanentDelete,
}: LinkCardProps) {
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()

  const thumb = link.thumbnail_url ? (
    <img
      src={link.thumbnail_url}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.display = 'none'
      }}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-3xl">
      {categoryEmoji(categories, link.category)}
    </div>
  )

  const visibleTags = link.tags?.slice(0, MAX_VISIBLE_TAGS) ?? []
  const hiddenTagCount = (link.tags?.length ?? 0) - visibleTags.length

  function renderMenuItems(close: () => void) {
    return (
      <>
        <button onClick={() => { onEdit(link); close() }} className="menu-item">
          <Pencil size={14} /> Edit
        </button>
        <button onClick={() => { onToggleImportant(link); close() }} className="menu-item">
          <Flag size={14} /> {link.is_important ? 'Unmark important' : 'Mark important'}
        </button>
        {link.is_deleted ? (
          <>
            <button onClick={() => { onRestore?.(link); close() }} className="menu-item">
              <ArchiveRestore size={14} /> Restore
            </button>
            <button
              onClick={() => { onPermanentDelete?.(link); close() }}
              className="menu-item text-red-400"
            >
              <Trash2 size={14} /> Delete permanently
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { onArchive(link, !link.is_archived); close() }} className="menu-item">
              <Archive size={14} /> {link.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            {link.is_archived && (
              <button
                onClick={() => { onPermanentDelete?.(link); close() }}
                className="menu-item text-red-400"
              >
                <Trash2 size={14} /> Delete permanently
              </button>
            )}
            <button onClick={() => { onDelete(link); close() }} className="menu-item text-red-400">
              <Trash2 size={14} /> Move to Trash
            </button>
          </>
        )}
      </>
    )
  }

  if (view === 'list') {
    return (
      <div className="group relative flex items-center gap-4 bg-base-900 border border-base-700/60 rounded-xl p-3 hover:border-accent-500/40 hover:shadow-card transition-all">
        <button
          onClick={() => onOpen(link)}
          className="w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-base-800 relative"
        >
          {thumb}
          {link.is_important && (
            <span className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-0.5">
              <Flag size={9} className="fill-white" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => onOpen(link)} className="text-left w-full">
            <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-accent-300 transition-colors">
              {link.title}
            </p>
          </button>
          {link.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{link.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
            <span>{sourceLabel(sources, link.source)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="px-1.5 py-0.5 rounded-md bg-base-800 text-slate-300">
              {categoryEmoji(categories, link.category)} {categoryLabel(categories, link.category)}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>{relativeDate(link.created_at)}</span>
            {link.view_count > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="flex items-center gap-1">
                  <Eye size={11} /> {link.view_count}
                </span>
              </>
            )}
          </div>
        </div>
        <button onClick={() => onToggleFavorite(link)} aria-label="Toggle favorite" className="p-1.5">
          <Star size={17} className={link.is_favorite ? 'fill-accent-400 text-accent-400' : 'text-slate-500'} />
        </button>
        <div className="relative">
          <CardMenu
            trigger={({ onClick, ref }) => (
              <button
                ref={ref}
                onClick={onClick}
                className="p-1.5 text-slate-400 hover:text-white"
                aria-label="More actions"
              >
                <MoreVertical size={17} />
              </button>
            )}
          >
            {renderMenuItems}
          </CardMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-base-900 border border-base-700/60 rounded-2xl overflow-hidden hover:border-accent-500/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative">
        <button onClick={() => onOpen(link)} className="block w-full aspect-video bg-base-800 relative overflow-hidden">
          {thumb}
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur text-white text-[11px] font-medium px-2 py-1 rounded-lg">
            <ExternalLink size={11} />
            {sourceLabel(sources, link.source)}
          </span>
          {link.is_important && (
            <span
              className="absolute top-2.5 right-2.5 bg-amber-500 text-white rounded-full p-1.5 shadow"
              title="Important"
            >
              <Flag size={11} className="fill-white" />
            </span>
          )}
          {link.link_status === 'broken' && (
            <span
              className={`absolute top-2.5 ${link.is_important ? 'right-11' : 'right-2.5'} bg-red-500/90 text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow`}
              title="This link may be broken — checked via Link Health"
            >
              Broken
            </span>
          )}
        </button>

        {/* Hover quick actions — Open / Edit / Favorite / Archive */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 p-2
          bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={() => onOpen(link)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur transition-colors"
            aria-label="Open"
            title="Open"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => onEdit(link)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur transition-colors"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onToggleFavorite(link)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur transition-colors"
            aria-label="Toggle favorite"
            title="Favorite"
          >
            <Star size={14} className={link.is_favorite ? 'fill-accent-400 text-accent-400' : ''} />
          </button>
          <button
            onClick={() => onArchive(link, !link.is_archived)}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur transition-colors"
            aria-label="Archive"
            title={link.is_archived ? 'Unarchive' : 'Archive'}
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <button onClick={() => onOpen(link)} className="text-left w-full">
          <h3 className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2 group-hover:text-accent-300 transition-colors min-h-[2.5rem]">
            {link.title}
          </h3>
        </button>

        {link.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{link.description}</p>
        )}

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visibleTags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-800 text-slate-400">
                #{t}
              </span>
            ))}
            {hiddenTagCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-800 text-slate-500">
                +{hiddenTagCount}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs px-2 py-1 rounded-lg bg-base-800 text-slate-300 flex items-center gap-1">
            {categoryEmoji(categories, link.category)} {categoryLabel(categories, link.category)}
          </span>
          <button onClick={() => onToggleFavorite(link)} aria-label="Toggle favorite">
            <Star size={16} className={link.is_favorite ? 'fill-accent-400 text-accent-400' : 'text-slate-500 hover:text-accent-400'} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            {relativeDate(link.created_at)}
            {link.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={11} /> {link.view_count}
              </span>
            )}
          </span>
          <div className="relative">
            <CardMenu
              trigger={({ onClick, ref }) => (
                <button ref={ref} onClick={onClick} className="p-1 hover:text-white" aria-label="More actions">
                  <MoreVertical size={16} />
                </button>
              )}
            >
              {renderMenuItems}
            </CardMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
