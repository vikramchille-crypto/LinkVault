import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CategoriesProvider } from '@/contexts/CategoriesContext'
import { SourcesProvider } from '@/contexts/SourcesContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/common/Loading'
import { Login } from '@/pages/Login'
import { ResetPassword } from '@/pages/ResetPassword'
import { Dashboard } from '@/pages/Dashboard'
import { AllLinks } from '@/pages/AllLinks'
import { Favorites } from '@/pages/Favorites'
import { Recent } from '@/pages/Recent'
import { Important } from '@/pages/Important'
import { Archive } from '@/pages/Archive'
import { Trash } from '@/pages/Trash'
import { ManageCategories } from '@/pages/ManageCategories'
import { ManageSources } from '@/pages/ManageSources'
import { ManageTags } from '@/pages/ManageTags'
import { DataTools } from '@/pages/DataTools'
import { LinkHealth } from '@/pages/LinkHealth'
import { Analytics } from '@/pages/Analytics'
import { Admin } from '@/pages/Admin'

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950">
      <Spinner size={28} />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Standalone route, deliberately checked before the loading/auth gate
  // below: it needs to work both for a logged-out visitor who just clicked
  // a password-reset email link (Supabase gives them a temporary recovery
  // session, separate from a normal login) and for an already logged-in
  // user changing their password from the account menu. Rendering it
  // outside AppLayout keeps it a clean, focused screen either way, with no
  // sidebar/dashboard chrome.
  if (location.pathname === '/reset-password') {
    return loading ? <FullScreenLoader /> : <ResetPassword />
  }

  if (loading) return <FullScreenLoader />
  if (!user) return <Login />

  return (
    <SourcesProvider>
      <CategoriesProvider>
        <AppLayout>
          {(ctx) => (
            <Routes>
              <Route path="/" element={<Dashboard {...ctx} />} />
              <Route path="/links" element={<AllLinks {...ctx} />} />
              <Route path="/favorites" element={<Favorites {...ctx} />} />
              <Route path="/recent" element={<Recent {...ctx} />} />
              <Route path="/important" element={<Important {...ctx} />} />
              <Route path="/archive" element={<Archive {...ctx} />} />
              <Route path="/trash" element={<Trash {...ctx} />} />
              <Route path="/categories" element={<ManageCategories />} />
              <Route path="/sources" element={<ManageSources />} />
              <Route path="/tags" element={<ManageTags {...ctx} />} />
              <Route path="/data" element={<DataTools {...ctx} />} />
              <Route path="/health" element={<LinkHealth {...ctx} />} />
              <Route path="/analytics" element={<Analytics {...ctx} />} />
              <Route path="/admin" element={<Admin />} />
              {/* Handled by AppLayout's effect (Android Share Target lands
                  here); render nothing while it processes and redirects. */}
              <Route path="/share" element={null} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </AppLayout>
      </CategoriesProvider>
    </SourcesProvider>
  )
}
