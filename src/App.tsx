import { lazy, Suspense } from 'react'
import { useAuth } from './auth/AuthContext'

// Lazy load de componentes pesados (incluyen Konva ~300KB)
const ClientApp = lazy(() => import('./client/ClientApp'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

// Componente de loading reutilizable
const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="loading-spinner"></div>
    <p>Cargando...</p>
  </div>
)

const App = () => {
  const { isInitialized, isAuthenticated, hasRole } = useAuth()

  // Show loading while Keycloak initializes
  if (!isInitialized) {
    return <LoadingFallback />
  }

  // If authenticated with Admin role, show admin panel
  if (isAuthenticated && hasRole('Admin')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AdminApp />
      </Suspense>
    )
  }

  // Default: show client view (public or with Cliente role)
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientApp />
    </Suspense>
  )
}

export default App
