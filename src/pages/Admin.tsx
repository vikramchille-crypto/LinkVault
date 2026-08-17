import { useEffect, useState } from 'react'
import { ShieldOff, Trash2, Loader2, Download, Users, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingGrid } from '@/components/common/Loading'

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  link_count: number
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function Admin() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    setForbidden(false)

    const { data, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
    })

    setLoading(false)
    if (fnError) {
      // A 403 from the function surfaces here as a generic invoke error;
      // check the response body for the specific "not authorized" message.
      const message = (fnError as { context?: { body?: { error?: string } } })?.context?.body?.error
      if (message?.includes('Not authorized')) {
        setForbidden(true)
      } else {
        setError("Couldn't load users. Make sure the admin-users Edge Function is deployed and ADMIN_EMAIL is set.")
      }
      return
    }
    if (data?.error) {
      if (data.error.includes('Not authorized')) setForbidden(true)
      else setError(data.error)
      return
    }
    setUsers(data.users)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Permanently delete ${user.email}'s account and all ${user.link_count} of their links? This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(user.id)
    const { data, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', userId: user.id },
    })
    setDeletingId(null)

    if (fnError || data?.error) {
      setError(data?.error || 'Delete failed.')
      return
    }
    setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? null)
  }

  async function handleBackup() {
    setBackingUp(true)
    const { data, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'backup' },
    })
    setBackingUp(false)

    if (fnError || data?.error) {
      setError(data?.error || 'Backup failed.')
      return
    }
    downloadBlob(JSON.stringify(data, null, 2), `linkvault-full-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <ShieldOff size={32} className="text-slate-600 mb-4" />
        <h2 className="text-base font-semibold text-slate-200">This page is restricted</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Only the designated admin account can view this page. If this is a mistake, check that your account's
          email matches the ADMIN_EMAIL secret configured on the server.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-accent-400" /> Admin
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts and back up all data.</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 bg-base-800 hover:bg-base-700 border border-base-700 text-slate-200
              text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="flex items-center gap-2 bg-accent-600 hover:bg-accent-500 disabled:opacity-60 text-white
              text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            {backingUp ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Download Full Backup
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingGrid count={4} />
      ) : (
        <div className="bg-base-900 border border-base-700/60 rounded-2xl divide-y divide-base-700/60">
          {users?.length === 0 && <p className="text-sm text-slate-500 px-5 py-8 text-center">No users yet.</p>}
          {users?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200 truncate">{u.email}</p>
                <p className="text-xs text-slate-500">
                  Joined {new Date(u.created_at).toLocaleDateString()} · {u.link_count} link
                  {u.link_count === 1 ? '' : 's'}
                  {u.last_sign_in_at && ` · Last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(u)}
                disabled={deletingId === u.id}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300
                  disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
              >
                {deletingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete Account
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
