import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { useAuth } from './lib/auth-context'
import { useUIStore } from './lib/ui-store'
import { LoginPage } from './pages/LoginPage'
import { RegistroPage } from './pages/RegistroPage'
import { PosPage } from './pages/PosPage'
import { CatalogoPage } from './pages/CatalogoPage'
import { RequireAuth } from './components/RequireAuth'
import { Layout } from './components/Layout'
import '@fontsource/jetbrains-mono'
import './index.css'

function Root() {
  const { session, loading } = useAuth()
  const theme = useUIStore((s) => s.theme)
  const zoom = useUIStore((s) => s.zoom)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom)
  }, [zoom])
  if (loading) return <p className="center">Cargando…</p>
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/registro" element={session ? <Navigate to="/" replace /> : <RegistroPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <PosPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/catalogo"
        element={
          <RequireAuth>
            <Layout>
              <CatalogoPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
