import { supabase } from '../lib/supabase'
import { getMockEmpresa, getMockEmpresaId, getMockUsuarioId } from './mock-data'

export type Empresa = {
  id: string
  nombre: string
  tasa_activa: number
  igtf_habilitado: boolean
  caja_obligatoria: boolean
  venta_sin_stock: boolean
  stock_negativo: boolean
}

export async function crearEmpresa(nombre: string): Promise<Empresa> {
  if (!supabase) {
    const empresa = getMockEmpresa()
    if (!empresa) throw new Error('No hay empresa local creada')
    return empresa
  }
  const { data, error } = await supabase
    .from('empresa')
    .insert({ nombre })
    .select()
    .single()
  if (error) throw error
  return data as Empresa
}

export async function obtenerMiEmpresa(): Promise<Empresa | null> {
  if (!supabase) {
    return getMockEmpresa()
  }
  // Reusa obtenerMiEmpresaId() (select plano de 'empresa_id' que ya funciona) y
  // consulta 'empresa' directo por id. El select embebido
  // usuario.empresa:id(...) devolvía data.empresa = null en PostgREST, rompiendo
  // el vínculo y ocultando el botón "Abrir caja".
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) return null
  const { data, error } = await supabase
    .from('empresa')
    .select('id, nombre, tasa_activa, igtf_habilitado, caja_obligatoria, venta_sin_stock, stock_negativo')
    .eq('id', empresaId)
    .single()
  if (error) return null
  return (data as Empresa) ?? null
}

// Cache de empresa_id para no consultarlo en cada búsqueda paginada.
let empresaIdCache: string | null | undefined
export async function obtenerMiEmpresaId(): Promise<string | null> {
  if (empresaIdCache !== undefined) return empresaIdCache
  if (!supabase) {
    empresaIdCache = getMockEmpresaId()
    return empresaIdCache
  }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    empresaIdCache = null
    return null
  }
  const { data } = await supabase
    .from('usuario')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .single()
  empresaIdCache = (data?.empresa_id as string) ?? null
  return empresaIdCache
}

// Limpia la cache de módulo. Debe llamarse en logout/cambio de cuenta para
// no devolver el empresa_id de una sesión anterior (deuda técnica item 2).
export function limpiarCacheEmpresa(): void {
  empresaIdCache = undefined
}

// Rol del usuario autenticado (gate de Inventario). Lee `usuario.rol`, que en
// el esquema es un enum ('cajero'|'inventario'|'admin'|'auditor'). Devuelve
// `null` si no hay sesión o no se puede resolver (así el llamador aplica su
// propio fallback de acceso).
export async function obtenerMiRol(): Promise<string | null> {
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', auth.user.id)
    .single()
  if (error) return null
  return (data?.rol as string | null) ?? null
}

// Cache local del uuid del usuario autenticado (firmado de ventas offline).
// Se persiste en localStorage para sobrevivir recargas en modo 100% offline:
// así la venta offline puede llevar usuario_id aunque no haya sesión activa
// en memoria. Mitiga W4 (usuario_id '' rompía el RPC aplicar_venta_offline).
const USUARIO_KEY = 'pv-uid'
let usuarioIdCache: string | null | undefined =
  typeof localStorage !== 'undefined'
    ? (localStorage.getItem(USUARIO_KEY) ?? undefined)
    : undefined

// Fija el uuid del usuario (llamar al iniciar sesión, en login/registro).
export function setUsuarioIdCache(id: string | null): void {
  usuarioIdCache = id
  if (typeof localStorage === 'undefined') return
  if (id) localStorage.setItem(USUARIO_KEY, id)
  else localStorage.removeItem(USUARIO_KEY)
}

// Limpia el uuid en logout/cambio de cuenta.
export function limpiarCacheUsuario(): void {
  usuarioIdCache = undefined
  if (typeof localStorage !== 'undefined') localStorage.removeItem(USUARIO_KEY)
}

// ID del usuario autenticado (para firmar la venta offline). Devuelve primero
// el uuid cacheado localmente (sobrevive a recargas offline); si no está
// cacheado, lo resuelve de la sesión (mock o Supabase) y lo cachea.
export async function obtenerMiUsuarioId(): Promise<string | null> {
  if (usuarioIdCache !== undefined) return usuarioIdCache
  let id: string | null
  if (!supabase) {
    id = getMockUsuarioId()
  } else {
    const { data: auth } = await supabase.auth.getUser()
    id = auth.user?.id ?? null
  }
  usuarioIdCache = id
  if (typeof localStorage !== 'undefined' && id) localStorage.setItem(USUARIO_KEY, id)
  return id
}
