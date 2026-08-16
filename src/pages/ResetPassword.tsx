import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function ResetPassword() {
  const { updatePassword, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
      setTimeout(() => navigate('/'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-extrabold text-white">
            Link<span className="text-accent-400">Vault</span>
          </h1>
        </div>

        <div className="bg-base-900 border border-base-700/60 rounded-2xl p-6 shadow-card">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm text-slate-200 font-medium">Password updated.</p>
              <p className="text-xs text-slate-400 mt-1">Taking you to your dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                {user ? 'Change your password' : 'Set a new password'}
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                {user
                  ? 'Enter a new password for your account.'
                  : "You've followed a password reset link — enter your new password below."}
              </p>

              {error && (
                <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              {!user && (
                <div className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  If this page doesn't recognize your reset link (e.g. it expired), request a new one from the sign-in
                  screen.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="field-label">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Confirm new password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field-input"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
                    disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
