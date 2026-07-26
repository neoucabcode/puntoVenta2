import { useEffect, useState, useCallback } from 'react'
import {
  obtenerModulosHabilitados,
  type ModuloEstado,
} from '../lib/modulos'

export type ModulosResult = {
  modulos: ModuloEstado[]
  loading: boolean
  /** Verifica si un módulo está habilitado */
  estaHabilitado: (nombre: string) => boolean
  /** Refresca la lista de módulos desde la BD */
  refrescar: () => Promise<void>
}

/**
 * Hook que carga y cachea los módulos habilitados para la empresa del usuario.
 * Se usa en Layout para filtrar la nav y en main.tsx para proteger rutas.
 */
export function useModulos(): ModulosResult {
  const [modulos, setModulos] = useState<ModuloEstado[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await obtenerModulosHabilitados()
      setModulos(data)
    } catch (err) {
      console.error('[useModulos] Error:', err)
      setModulos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const estaHabilitado = useCallback(
    (nombre: string) => modulos.some((m) => m.modulo === nombre && m.habilitado),
    [modulos]
  )

  return { modulos, loading, estaHabilitado, refrescar: cargar }
}
