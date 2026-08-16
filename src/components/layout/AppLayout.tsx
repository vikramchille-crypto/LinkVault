import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AddLinkModal } from '@/components/links/AddLinkModal'
import { useLinks } from '@/hooks/useLinks'
import { guessSourceKey } from '@/utils/source'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { LinkFormInput } from '@/types'

interface AppLayoutProps {
  children: (ctx: ReturnType<typeof useLinks> & { search: string; openAddLink: () => void }) => ReactNode
}

// Owns the single useLinks() instance and the Add Link modal so every page
// shares the same data and "+ Add Link" entry point (sidebar quick add,
// dashboard button, or empty states can all trigger it).
export function AppLayout({ children }: AppLayoutProps) {
  const linksState = useLinks()
  const { sources } = useSourcesContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [sharePrefill, setSharePrefill] = useState<Partial<LinkFormInput> | undefined>(undefined)

  // Android's Share Target sends the user to /share?url=...&title=...&text=...
  // (see public/manifest.webmanifest). Catch that here, pre-fill Add Link
  // with it, then clean up the URL back to the dashboard.
  useEffect(() => {
    if (location.pathname !== '/share') return
    const params = new URLSearchParams(location.search)
    const sharedUrl = params.get('url') || extractUrlFromText(params.get('text'))
    if (sharedUrl) {
      const guessedSource = guessSourceKey(sharedUrl, sources)
      setSharePrefill({
        url: sharedUrl,
        title: params.get('title') || '',
        source: guessedSource ?? undefined,
      })
      setModalOpen(true)
    }
    navigate('/', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  function extractUrlFromText(text: string | null): string | null {
    if (!text) return null
    const match = text.match(/https?:\/\/\S+/)
    return match?.[0] ?? null
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-base-950">
      <Sidebar
        links={linksState.links}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onAddLink={() => setModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onMenuClick={() => setSidebarOpen(true)}
          links={linksState.links}
        />
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto">
          {children({ ...linksState, search, openAddLink: () => setModalOpen(true) })}
        </main>
      </div>

      {/* Mobile-only floating Add button — the sidebar's Add Link button is
          hidden behind the hamburger menu on small screens, so this keeps
          the most common action one tap away. */}
      <button
        onClick={() => setModalOpen(true)}
        className="lg:hidden fixed z-30 bottom-5 right-5 w-14 h-14 rounded-full bg-accent-600 hover:bg-accent-500
          text-white shadow-card-hover flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        aria-label="Add Link"
      >
        <Plus size={26} />
      </button>

      <AddLinkModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSharePrefill(undefined)
        }}
        onSubmit={linksState.addLink}
        allTags={[...new Set(linksState.links.flatMap((l) => l.tags ?? []))]}
        initialValues={sharePrefill}
      />
    </div>
  )
}
