import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-red-500/20 bg-red-500/5">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">Something went wrong</h3>
      <p className="text-sm text-slate-400 mt-1.5 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 bg-base-800 hover:bg-base-700 text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
