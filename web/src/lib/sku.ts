import { supabase } from './supabase'
import {
  obtenerConfigSkuMock,
  generarSkuMock,
  buscarProductosSimilaresMock,
  actualizarConfigSkuMock,
} from './mock-data'

export type EmpresaConfigSku = {
  id: string
  empresa_id: string
  autogenerar_activo: boolean
  plantilla: 'categoria_secuencial' | 'solo_secuencial' | 'prefijo_fijo_secuencial'
  usa_categoria: boolean
  modo_contador: 'por_categoria' | 'global'
  longitud_secuencial: number
  prefijo_manual: string | null
  umbral_similitud: number
  creado_en: string
  actualizado_en: string
}

// Convierte el string que PostgREST devuelve para numeric en número.
// Misma función que en productos.ts, pero local para no romper módulos.
function parseNumeric(v: unknown, campo: string): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  if (Number.isNaN(n)) {
    throw new Error(`Campo numérico inválido "${campo}": ${String(v)}`)
  }
  return n
}

// Obtiene la configuración de SKU de la empresa actual desde Supabase.
// Devuelve null si no existe fila (la empresa no ha configurado SKU).
export async function obtenerConfigSku(empresaId: string): Promise<EmpresaConfigSku | null> {
  if (!supabase) {
    const mock = await obtenerConfigSkuMock(empresaId)
    if (!mock) return null
    return mapRowToConfig(mock)
  }

  const { data, error } = await supabase
    .from('empresa_configuracion_sku')
    .select('*')
    .eq('empresa_id', empresaId)
    .single()
  if (error) {
    // PGRST116 = no rows returned (empresa sin config aún)
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRowToConfig(data)
}

// Genera un SKU vía RPC según la configuración de la empresa.
// Devuelve null si autogenerar_activo está desactivado.
export async function generarSku(
  empresaId: string,
  categoriaId?: string
): Promise<string | null> {
  if (!supabase) {
    return generarSkuMock(empresaId, categoriaId)
  }

  const { data, error } = await supabase.rpc('generar_sku', {
    p_empresa_id: empresaId,
    p_categoria_id: categoriaId ?? null,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

// Lee el contador actual SIN incrementarlo, para previsualizar el próximo SKU.
// Devuelve null si no hay configuración o autogenerar está desactivado.
export async function obtenerPreviewSku(
  empresaId: string,
  categoriaId?: string
): Promise<string | null> {
  if (!supabase) {
    return generarSkuMock(empresaId, categoriaId)
  }

  const config = await obtenerConfigSku(empresaId)
  if (!config || !config.autogenerar_activo) return null

  // Leer el contador actual sin incrementar
  let query = supabase
    .from('empresa_sku_contador')
    .select('ultimo_valor')
    .eq('empresa_id', empresaId)

  if (config.modo_contador === 'por_categoria' && categoriaId) {
    query = query.eq('categoria_id', categoriaId)
  } else {
    query = query.is('categoria_id', null)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error

  const contadorActual = data ? Number(data.ultimo_valor) : 0
  const siguiente = contadorActual + 1
  const padded = String(siguiente).padStart(config.longitud_secuencial, '0')

  if (config.plantilla === 'prefijo_fijo_secuencial' && config.prefijo_manual) {
    return `${config.prefijo_manual}-${padded}`
  }
  if (config.plantilla === 'categoria_secuencial' && categoriaId) {
    // Obtener código de categoría
    const { data: catData } = await supabase
      .from('categoria')
      .select('codigo')
      .eq('id', categoriaId)
      .eq('empresa_id', empresaId)
      .single()
    const catCode = (catData?.codigo as string | null)?.toUpperCase()
    if (!catCode) return null
    return `${catCode}-${padded}`
  }
  return padded
}

// Busca productos con nombres similares usando trigram similarity.
// Retorna los que superan el umbral, ordenados por similitud DESC.
export async function buscarProductosSimilares(
  empresaId: string,
  texto: string,
  umbral?: number
): Promise<Array<{ id: string; nombre: string; sku: string; similitud: number }>> {
  if (!supabase) {
    return buscarProductosSimilaresMock(empresaId, texto, umbral)
  }

  const { data, error } = await supabase.rpc('buscar_productos_similares', {
    p_empresa_id: empresaId,
    p_texto: texto,
    p_umbral: umbral ?? 0.3,
  })
  if (error) throw error
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    sku: r.sku as string,
    similitud: parseNumeric(r.similitud, 'similitud'),
  }))
}

// Actualiza la configuración de SKU de la empresa (solo admin).
// Hace un merge parcial: solo actualiza los campos provistos.
export async function actualizarConfigSku(
  empresaId: string,
  config: Partial<EmpresaConfigSku>
): Promise<void> {
  if (!supabase) {
    await actualizarConfigSkuMock(empresaId, config)
    return
  }

  const { error } = await supabase
    .from('empresa_configuracion_sku')
    .update({
      ...(config.autogenerar_activo !== undefined && { autogenerar_activo: config.autogenerar_activo }),
      ...(config.plantilla !== undefined && { plantilla: config.plantilla }),
      ...(config.usa_categoria !== undefined && { usa_categoria: config.usa_categoria }),
      ...(config.modo_contador !== undefined && { modo_contador: config.modo_contador }),
      ...(config.longitud_secuencial !== undefined && { longitud_secuencial: config.longitud_secuencial }),
      ...(config.prefijo_manual !== undefined && { prefijo_manual: config.prefijo_manual }),
      ...(config.umbral_similitud !== undefined && { umbral_similitud: config.umbral_similitud }),
      actualizado_en: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId)
  if (error) throw error
}

// Mapea una fila cruda de Supabase al tipo EmpresaConfigSku.
function mapRowToConfig(row: Record<string, unknown>): EmpresaConfigSku {
  return {
    id: row.id as string,
    empresa_id: row.empresa_id as string,
    autogenerar_activo: Boolean(row.autogenerar_activo),
    plantilla: row.plantilla as EmpresaConfigSku['plantilla'],
    usa_categoria: Boolean(row.usa_categoria),
    modo_contador: row.modo_contador as EmpresaConfigSku['modo_contador'],
    longitud_secuencial: parseNumeric(row.longitud_secuencial, 'longitud_secuencial'),
    prefijo_manual: (row.prefijo_manual as string) ?? null,
    umbral_similitud: parseNumeric(row.umbral_similitud, 'umbral_similitud'),
    creado_en: row.creado_en as string,
    actualizado_en: row.actualizado_en as string,
  }
}
