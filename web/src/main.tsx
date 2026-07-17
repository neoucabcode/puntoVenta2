import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { useAuth } from './lib/auth-context'
import { LoginPage } from './pages/LoginPage'
import { RegistroPage } from './pages/RegistroPage'
import { PosPage } from './pages/PosPage'
import { RequireAuth } from './components/RequireAuth'
import { Layout } from './components/Layout'
import './index.css'

function Root() {
  const { session, loading } = useAuth()
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
