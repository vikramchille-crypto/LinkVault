import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Link2,
  Star,
  Clock,
  Flag,
  Archive,
  Trash2,
  Plus,
  X,
  Settings,
  ChevronRight,
  Tag,
  BarChart3,
  ShieldCheck,
  ArrowLeftRight,
} from 'lucide-react'
import { useCategoriesContext } from '@/contexts/CategoriesContext'
import { useSourcesContext } from '@/contexts/SourcesContext'
import type { LinkRecord } from '@/types'

interface SidebarProps {
  links: LinkRecord[]
  isOpen: boolean
  onClose: () => void
  onAddLink: () => void
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/links', label: 'All Links', icon: Link2 },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/recent', label: 'Recent', icon: Clock },
  { to: '/important', label: 'Important', icon: Flag },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/trash', label: 'Trash', icon: Trash2 },
]

export function Sidebar({ links, isOpen, onClose, onAddLink }: SidebarProps) {
  const { categories } = useCategoriesContext()
  const { sources } = useSourcesContext()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const active = links.filter((l) => !l.is_deleted && !l.is_archived)

  function countForSource(sourceKey: string) {
    return active.filter((l) => l.source === sourceKey).length
  }

  function countForSourceAndCategory(sourceKey: string, categoryKey: string) {
    return active.filter((l) => l.source === sourceKey && l.category === categoryKey).length
  }

  function toggle(sourceId: string) {
    setExpanded((prev) => ({ ...prev, [sourceId]: !prev[sourceId] }))
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-72 flex flex-col
          bg-base-900 border-r border-base-700/60
          transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h1 className="text-xl font-display font-extrabold tracking-tight text-white">
              Link<span className="text-accent-400">Vault</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Your Personal Reference Library</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-accent-600/15 text-accent-300 border border-accent-500/30'
                        : 'text-slate-300 hover:bg-base-800 hover:text-white border border-transparent'
                    }`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Sources are the root grouping. Expand one to filter further by
              category — the nested, second-level grouping. */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Sources</p>
              <NavLink
                to="/sources"
                onClick={onClose}
                className="text-slate-500 hover:text-accent-400 transition-colors"
                aria-label="Manage sources"
                title="Manage sources"
              >
                <Settings size={13} />
              </NavLink>
            </div>
            <ul className="space-y-0.5">
              {sources.map((s) => (
                <li key={s.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => toggle(s.id)}
                      className="p-1.5 text-slate-500 hover:text-white shrink-0"
                      aria-label={expanded[s.id] ? `Collapse ${s.label}` : `Expand ${s.label}`}
                    >
                      <ChevronRight
                        size={13}
                        className={`transition-transform ${expanded[s.id] ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <NavLink
                      to={`/links?source=${s.key}`}
                      onClick={onClose}
                      className="flex-1 flex items-center justify-between px-2 py-2 rounded-xl text-sm text-slate-300 hover:bg-base-800 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden="true">{s.icon}</span>
                        {s.label}
                      </span>
                      <span className="text-xs text-slate-500 bg-base-800 rounded-full px-2 py-0.5">
                        {countForSource(s.key)}
                      </span>
                    </NavLink>
                  </div>

                  {expanded[s.id] && (
                    <ul className="ml-7 mt-0.5 mb-1 space-y-0.5 border-l border-base-700/60 pl-2">
                      {categories.map((c) => (
                        <li key={c.id}>
                          <NavLink
                            to={`/links?source=${s.key}&category=${c.key}`}
                            onClick={onClose}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-base-800 hover:text-white transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true">{c.emoji}</span>
                              {c.label}
                            </span>
                            <span className="text-slate-600">{countForSourceAndCategory(s.key, c.key)}</span>
                          </NavLink>
                        </li>
                      ))}
                      <li>
                        <NavLink
                          to="/categories"
                          onClick={onClose}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-accent-400 transition-colors"
                        >
                          <Settings size={11} /> Manage categories
                        </NavLink>
                      </li>
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Categories — the nested level under Source, but always visible
              here too so you don't have to expand a source to filter by it
              across everything. */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Categories</p>
              <NavLink
                to="/categories"
                onClick={onClose}
                className="text-slate-500 hover:text-accent-400 transition-colors"
                aria-label="Manage categories"
                title="Manage categories"
              >
                <Settings size={13} />
              </NavLink>
            </div>
            <ul className="space-y-0.5">
              {categories.map((c) => (
                <li key={c.id}>
                  <NavLink
                    to={`/links?category=${c.key}`}
                    onClick={onClose}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-base-800 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true">{c.emoji}</span>
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-500 bg-base-800 rounded-full px-2 py-0.5">
                      {active.filter((l) => l.category === c.key).length}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <NavLink
              to="/tags"
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl text-sm text-slate-400 hover:bg-base-800 hover:text-accent-400 transition-colors"
            >
              <Tag size={15} />
              Manage Tags
            </NavLink>
          </div>

          <div className="mt-6 px-3">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">Tools</p>
            <ul className="space-y-0.5">
              {[
                { to: '/analytics', label: 'Analytics', icon: BarChart3 },
                { to: '/health', label: 'Link Health', icon: ShieldCheck },
                { to: '/data', label: 'Import & Export', icon: ArrowLeftRight },
              ].map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors
                      ${isActive ? 'text-accent-300 bg-accent-600/10' : 'text-slate-400 hover:bg-base-800 hover:text-white'}`
                    }
                  >
                    <Icon size={15} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-base-700/60">
          <button
            onClick={onAddLink}
            className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
              text-white font-semibold text-sm py-2.5 rounded-xl shadow-card transition-colors"
          >
            <Plus size={16} />
            Add Link
          </button>
        </div>
      </aside>
    </>
  )
}
