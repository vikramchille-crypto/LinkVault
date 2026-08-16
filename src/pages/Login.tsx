import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function Login() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle, sendPasswordResetEmail } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    if (mode === 'forgot') {
      const result = await sendPasswordResetEmail(email)
      setLoading(false)
      if (result.error) {
        setError(result.error)
      } else {
        setNotice("If that email has an account, we've sent a password reset link.")
      }
      return
    }

    const result =
      mode === 'signin' ? await signInWithPassword(email, password) : await signUpWithPassword(email, password)

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (mode === 'signup') {
      setNotice('Check your inbox to confirm your email, then sign in.')
      setMode('signin')
    }
  }

  function switchMode(m: 'signin' | 'signup' | 'forgot') {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-extrabold text-white">
            Link<span className="text-accent-400">Vault</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your Personal Reference Library</p>
        </div>

        <div className="bg-base-900 border border-base-700/60 rounded-2xl p-6 shadow-card">
          {!isSupabaseConfigured && (
            <div className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
              Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> — see the README.
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="flex bg-base-800 rounded-xl p-1 mb-5">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                    mode === m ? 'bg-accent-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-100">Reset your password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your email and we'll send you a link to set a new password.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  placeholder="••••••••"
                />
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-slate-400 hover:text-accent-400 transition-colors mt-1.5"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-500
                disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('signin')}
              className="w-full text-center text-xs text-slate-400 hover:text-accent-400 transition-colors mt-4"
            >
              Back to sign in
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-base-700 flex-1" />
                <span className="text-xs text-slate-500">or</span>
                <div className="h-px bg-base-700 flex-1" />
              </div>

              <button
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-2 bg-base-800 hover:bg-base-700 border border-base-700
                  text-slate-200 font-medium text-sm py-2.5 rounded-xl transition-colors"
              >
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
