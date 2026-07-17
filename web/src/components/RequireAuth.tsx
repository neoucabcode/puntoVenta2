import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="center">Cargando…</p>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
