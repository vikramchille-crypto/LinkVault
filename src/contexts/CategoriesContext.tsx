import { createContext, useContext, type ReactNode } from 'react'
import { useCategories } from '@/hooks/useCategories'

type CategoriesContextValue = ReturnType<typeof useCategories>

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const value = useCategories()
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategoriesContext() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategoriesContext must be used within CategoriesProvider')
  return ctx
}
