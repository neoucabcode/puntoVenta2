import { supabase } from '../lib/supabase'
import { getMockEmpresa, getMockEmpresaId } from './mock-data'

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
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase
    .from('usuario')
    .select('empresa:id(id, nombre, tasa_activa, igtf_habilitado, caja_obligatoria, venta_sin_stock, stock_negativo)')
    .eq('id', auth.user.id)
    .single()
  return (data?.empresa as unknown as Empresa) ?? null
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
