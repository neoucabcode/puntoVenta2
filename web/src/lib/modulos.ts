import { supabase } from './supabase'
import { obtenerMiEmpresaId } from './empresa'

export type ModuloEstado = {
  modulo: string
  habilitado: boolean
}

/** Módulos disponibles en la aplicación */
export const MODULOS_DISPONIBLES = ['catalogo', 'venta', 'inventario', 'caja', 'reportes'] as const
export type ModuloNombre = typeof MODULOS_DISPONIBLES[number]

/**
 * Obtiene los módulos habilitados para la empresa del usuario actual.
 * En desarrollo sin Supabase, retorna todos habilitados.
 */
export async function obtenerModulosHabilitados(): Promise<ModuloEstado[]> {
  if (!supabase) {
    return MODULOS_DISPONIBLES.map((m) => ({ modulo: m, habilitado: true }))
  }

  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) return []

  const { data, error } = await supabase
    .from('empresa_modulos')
    .select('modulo, habilitado')
    .eq('empresa_id', empresaId)

  if (error) {
    console.error('[modulos] Error al obtener módulos:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Verifica si un módulo específico está habilitado.
 */
export async function moduloHabilitado(nombre: string): Promise<boolean> {
  const modulos = await obtenerModulosHabilitados()
  return modulos.some((m) => m.modulo === nombre && m.habilitado)
}

/**
 * Activa o desactiva un módulo (solo admin).
 */
export async function toggleModulo(nombre: string, habilitado: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase no disponible')

  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) throw new Error('No se pudo resolver empresa_id')

  const { error } = await supabase
    .from('empresa_modulos')
    .upsert(
      { empresa_id: empresaId, modulo: nombre, habilitado },
      { onConflict: 'empresa_id,modulo' }
    )

  if (error) throw error
}
