import { useEffect, useState } from 'react'
import { obtenerMiRol } from '../lib/empresa'

export type AccesoInventario = {
  esAdmin: boolean
  inventarioHabilitado: boolean
}

/**
 * Resuelve si el rol habilita Inventario, de forma pura y testeable.
 *
 * - `rol === 'admin'` → acceso total.
 * - `rol` nulo/undefined en DESARROLLO → fallback a admin (con warning) para no
 *   bloquear al dueño mientras se define el rol en BD.
 * - `rol` nulo/undefined en PRODUCCIÓN → denegado: el rol debe ser explícito.
 * - Kill-switch `VITE_INVENTARIO_ENABLED === 'false'` desactiva la sección
 *   aunque el rol sea admin.
 */
export function resolverAccesoInventario(
  rol: string | null | undefined,
  opts?: { dev?: boolean; killSwitch?: boolean }
): AccesoInventario {
  const dev = opts?.dev ?? import.meta.env.DEV
  const killSwitch = opts?.killSwitch ?? import.meta.env.VITE_INVENTARIO_ENABLED !== 'false'
  let esAdmin = rol === 'admin'
  if (!esAdmin && (rol === null || rol === undefined)) {
    if (dev) {
      console.warn(
        '[useUsuarioRol] rol no definido; fallback de desarrollo => admin. ' +
          'En producción el rol debe ser explícito (usuario.rol = "admin").'
      )
      esAdmin = true
    }
  }
  return { esAdmin, inventarioHabilitado: esAdmin && killSwitch }
}

export function useUsuarioRol() {
  const [rol, setRol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    obtenerMiRol()
      .then((r) => {
        if (active) setRol(r)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const { esAdmin, inventarioHabilitado } = resolverAccesoInventario(rol)
  return { rol, esAdmin, inventarioHabilitado, loading }
}
