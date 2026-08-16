import { Menu, Search, Sun, Moon, Bell, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { NaturalLanguageSearch } from './NaturalLanguageSearch'
import type { LinkRecord } from '@/types'

interface TopBarProps {
  search: string
  onSearchChange: (value: string) => void
  onMenuClick: () => void
  links: LinkRecord[]
}

export function TopBar({ search, onSearchChange, onMenuClick, links }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  // Debounced locally so typing feels instant, but the (potentially
  // expensive, list-wide) filter recompute downstream only runs ~250ms
  // after the user pauses — matters once a library has hundreds of links.
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => setLocalSearch(search), [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch)
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch])

  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-base-950/80 backdrop-blur border-b border-base-700/60">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-300 hover:text-white p-1.5 -ml-1.5"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="relative flex-1 max-w-xl">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          type="text"
          placeholder="Search links, tags, categories..."
          className="w-full bg-base-800/80 border border-base-700 rounded-xl pl-10 pr-4 py-2.5 text-sm
            text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60
            focus:border-accent-500/60 transition"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        <NaturalLanguageSearch links={links} />

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-base-800 transition-colors"
          aria-label="Toggle theme"
          title="Toggle dark / light mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-base-800 transition-colors relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-accent-600 text-white text-xs font-bold flex items-center justify-center
              hover:bg-accent-500 transition-colors"
            aria-label="User menu"
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-base-850 border border-base-700 rounded-xl shadow-card py-1.5 z-30">
              <p className="px-3.5 py-2 text-xs text-slate-400 truncate border-b border-base-700/60">
                {user?.email}
              </p>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-slate-200 hover:bg-base-800"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
