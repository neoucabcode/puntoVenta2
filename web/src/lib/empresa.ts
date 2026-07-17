import { supabase } from '../lib/supabase'

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
  const { data, error } = await supabase
    .from('empresa')
    .insert({ nombre })
    .select()
    .single()
  if (error) throw error
  return data as Empresa
}

export async function obtenerMiEmpresa(): Promise<Empresa | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase
    .from('usuario')
    .select('empresa:id(nombre, tasa_activa, igtf_habilitado, caja_obligatoria, venta_sin_stock, stock_negativo)')
    .eq('id', auth.user.id)
    .single()
  return (data?.empresa as unknown as Empresa) ?? null
}
