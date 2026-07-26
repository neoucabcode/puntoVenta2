import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useModulos } from '../hooks/useModulos'

type Props = {
  modulo: string
  children: ReactNode
  fallback?: string
}

/**
 * Protege una ruta verificando que el módulo esté habilitado.
 * Si no lo está, redirige al fallback (por defecto /catalogo).
 */
export function RequireModulo({ modulo, children, fallback = '/catalogo' }: Props) {
  const { estaHabilitado, loading } = useModulos()

  if (loading) return <p className="center">Cargando…</p>

  if (!estaHabilitado(modulo)) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
