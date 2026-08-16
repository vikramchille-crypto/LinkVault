import { createContext, useContext, type ReactNode } from 'react'
import { useSources } from '@/hooks/useSources'

type SourcesContextValue = ReturnType<typeof useSources>

const SourcesContext = createContext<SourcesContextValue | undefined>(undefined)

export function SourcesProvider({ children }: { children: ReactNode }) {
  const value = useSources()
  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>
}

export function useSourcesContext() {
  const ctx = useContext(SourcesContext)
  if (!ctx) throw new Error('useSourcesContext must be used within SourcesProvider')
  return ctx
}
