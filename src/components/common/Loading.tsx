export function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-base-700/60 bg-base-900 animate-pulse">
          <div className="aspect-video bg-base-800" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-base-800 rounded w-3/4" />
            <div className="h-3.5 bg-base-800 rounded w-1/2" />
            <div className="h-3 bg-base-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-600 border-t-accent-500"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}
