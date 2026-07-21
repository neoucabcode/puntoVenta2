import { supabase } from './supabase'
import { obtenerMiEmpresaId, obtenerMiUsuarioId } from './empresa'
import {
  listarProductosMock,
  listarCategoriasMock,
  crearProductoMock,
  actualizarProductoMock,
  desactivarProductoMock,
  reactivarProductoMock,
  crearCategoriaMock,
  subirImagenProductoMock,
  verificarSkuDuplicadoMock,
  verificarCodigoDuplicadoMock,
} from './mock-data'

export type Producto = {
  id: string
  codigo_barras: string | null
  sku: string | null
  nombre: string
  categoria_id: string | null
  unidad: string
  // El dominio es numérico, pero PostgREST lo trae como string. Se parsea
  // con parseNumeric() (lanza si está roto) en listarProductos, NO con
  // Number(??0) silencioso (deuda técnica item 4: catálogo vacío/erróneo).
  costo_usd: number
  precio_usd: number
  imagen_url: string | null
  stock_actual: number
  stock_minimo: number
  activo: boolean
}

export const PAGE_SIZE = 50

// Convierte el string que PostgREST devuelve para numeric en número.
// Si el valor es inválido, lanza en vez de devolver 0 silencioso (evita
// catálogo vacío/erróneo por datos rotos).
function parseNumeric(v: unknown, campo: string): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  if (Number.isNaN(n)) {
    throw new Error(`Campo numérico inválido "${campo}": ${String(v)}`)
  }
  return n
}

export type ListarResult = {
  items: ProductoJoin[]
  hasMore: boolean
}

export type Categoria = {
  id: string
  nombre: string
}

export type ProductoJoin = Producto & {
  categoria: Categoria | null
}

export type ProductoInput = {
  codigo_barras?: string | null
  sku?: string | null
  nombre: string
  categoria_id?: string | null
  unidad?: string
  costo_usd?: number
  precio_usd?: number
  imagen_url?: string | null
  stock_actual?: number
  stock_minimo?: number
  activo?: boolean
}

export async function listarProductos(opts?: {
  search?: string
  categoriaId?: string | null
  soloActivos?: boolean
  offset?: number
  pageSize?: number
}): Promise<ListarResult> {
  if (!supabase) {
    const res = await listarProductosMock(opts)
    return { items: res.items as ProductoJoin[], hasMore: res.hasMore }
  }

  const limit = opts?.pageSize ?? PAGE_SIZE
  const offset = opts?.offset ?? 0
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) return { items: [], hasMore: false }

  const { data, error } = await supabase.rpc('buscar_productos', {
    p_empresa_id: empresaId,
    p_search: opts?.search?.trim() ?? '',
    p_categoria_id: opts?.categoriaId ?? null,
    p_solo_activos: opts?.soloActivos ?? true,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error

  const items = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const cat = r.categoria as { id: string; nombre: string } | null
    return {
      id: r.id as string,
      codigo_barras: (r.codigo_barras as string) ?? null,
      sku: (r.sku as string) ?? null,
      nombre: r.nombre as string,
      categoria_id: (r.categoria_id as string) ?? null,
      unidad: (r.unidad as string) ?? 'unidad',
      costo_usd: parseNumeric(r.costo_usd, 'costo_usd'),
      precio_usd: parseNumeric(r.precio_usd, 'precio_usd'),
      imagen_url: (r.imagen_url as string) ?? null,
      stock_actual: parseNumeric(r.stock_actual, 'stock_actual'),
      stock_minimo: parseNumeric(r.stock_minimo, 'stock_minimo'),
      activo: Boolean(r.activo),
      categoria: cat ? { id: cat.id, nombre: cat.nombre } : null,
    } as ProductoJoin
  })

  const hasMore = items.length >= limit
  return { items, hasMore }
}

export async function listarCategorias(): Promise<Categoria[]> {
  if (!supabase) {
    const data = await listarCategoriasMock()
    return data
  }
  const { data, error } = await supabase
    .from('categoria')
    .select('id,nombre')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  if (!supabase) {
    return crearProductoMock(input) as Promise<Producto>
  }
  // Aislamiento multi-tenant: el producto debe pertenecer a la empresa del
  // usuario autenticado. La columna `empresa_id` es NOT NULL y la RLS
  // `with check es_de_empresa` lo exige; sin esto el insert falla en runtime.
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) {
    throw new Error('No se pudo determinar la empresa para crear el producto')
  }
  const { data, error } = await supabase
    .from('producto')
    .insert({
      empresa_id: empresaId,
      codigo_barras: input.codigo_barras ?? null,
      sku: input.sku ?? null,
      nombre: input.nombre,
      categoria_id: input.categoria_id ?? null,
      unidad: input.unidad ?? 'unidad',
      costo_usd: input.costo_usd ?? 0,
      precio_usd: input.precio_usd ?? 0,
      imagen_url: input.imagen_url ?? null,
      stock_actual: input.stock_actual ?? 0,
      stock_minimo: input.stock_minimo ?? 0,
      activo: input.activo ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data as Producto
}

export async function actualizarProducto(
  id: string,
  input: ProductoInput
): Promise<Producto> {
  if (!supabase) {
    return actualizarProductoMock(id, input) as Promise<Producto>
  }
  const { data, error } = await supabase
    .from('producto')
    .update({
      codigo_barras: input.codigo_barras ?? null,
      sku: input.sku ?? null,
      nombre: input.nombre,
      categoria_id: input.categoria_id ?? null,
      unidad: input.unidad ?? 'unidad',
      costo_usd: input.costo_usd ?? 0,
      precio_usd: input.precio_usd ?? 0,
      imagen_url: input.imagen_url ?? null,
      stock_actual: input.stock_actual ?? 0,
      stock_minimo: input.stock_minimo ?? 0,
      activo: input.activo ?? true,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Producto
}

export async function desactivarProducto(id: string): Promise<void> {
  if (!supabase) {
    await desactivarProductoMock(id)
    return
  }
  const { error } = await supabase
    .from('producto')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

export async function reactivarProducto(id: string): Promise<void> {
  if (!supabase) {
    await reactivarProductoMock(id)
    return
  }
  const { error } = await supabase
    .from('producto')
    .update({ activo: true })
    .eq('id', id)
  if (error) throw error
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  if (!supabase) {
    return crearCategoriaMock(nombre)
  }
  // Aislamiento multi-tenant: `empresa_id` es NOT NULL y la RLS lo exige en el
  // insert de `categoria`. Sin esto el alta de categoría falla en runtime.
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) {
    throw new Error('No se pudo determinar la empresa para crear la categoría')
  }
  const { data, error } = await supabase
    .from('categoria')
    .insert({ nombre, empresa_id: empresaId })
    .select('id,nombre')
    .single()
  if (error) throw error
  return data as Categoria
}

export async function subirImagenProducto(
  file: File,
  empresaId: string,
  productoId: string
): Promise<string> {
  if (!supabase) {
    return subirImagenProductoMock(file, empresaId, productoId)
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
  const path = `${empresaId}/${productoId}.${ext}`
  const { error } = await supabase.storage
    .from('productos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('productos').getPublicUrl(path)
  return data.publicUrl
}

export async function verificarSkuDuplicado(
  sku: string | null,
  ignorarId?: string | null
): Promise<boolean> {
  if (!supabase) {
    return verificarSkuDuplicadoMock(sku)
  }
  if (!sku) return false
  let q = supabase
    .from('producto')
    .select('id')
    .eq('sku', sku)
    .limit(1)
  if (ignorarId) q = q.neq('id', ignorarId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).length > 0
}

export async function verificarCodigoDuplicado(
  codigo: string | null,
  ignorarId?: string | null
): Promise<boolean> {
  if (!supabase) {
    return verificarCodigoDuplicadoMock(codigo)
  }
  if (!codigo) return false
  let q = supabase
    .from('producto')
    .select('id')
    .eq('codigo_barras', codigo)
    .limit(1)
  if (ignorarId) q = q.neq('id', ignorarId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).length > 0
}

// Valuación total del inventario = Σ(costo × stock) del tenant.
export function calcularValuacion(
  productos: Array<{ costo_usd: number; stock_actual: number }>
): number {
  return productos.reduce((acc, p) => acc + (p.costo_usd * p.stock_actual), 0)
}

// Mapea el motivo legible del ajuste al `tipo` de `movimiento_inventario`.
function mapearMotivoATipo(motivo: string): string {
  if (motivo === 'merma') return 'merma'
  if (motivo === 'devolución') return 'devolucion'
  return 'ajuste'
}

export type HistorialEntry = {
  id: string
  empresa_id: string
  producto_id: string | null
  producto_nombre: string
  accion: 'creado' | 'editado' | 'eliminado' | 'ajuste_stock'
  detalles: Record<string, unknown>
  usuario_id: string | null
  creado_en: string
}

export async function eliminarProducto(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('La eliminación requiere conexión con la base de datos')
  }
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) {
    throw new Error('No se pudo determinar la empresa')
  }
  const { error } = await supabase
    .from('producto')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId)
  if (error) throw error
}

export async function registrarHistorial(
  empresaId: string,
  productoId: string | null,
  productoNombre: string,
  accion: string,
  detalles: Record<string, unknown>
): Promise<void> {
  if (!supabase) return
  const usuarioId = await obtenerMiUsuarioId()
  void supabase
    .from('producto_historial')
    .insert({
      empresa_id: empresaId,
      producto_id: productoId,
      producto_nombre: productoNombre,
      accion,
      detalles,
      usuario_id: usuarioId,
    })
}

export async function obtenerHistorial(
  empresaId: string,
  opts?: { productoId?: string; accion?: string; limit?: number }
): Promise<HistorialEntry[]> {
  if (!supabase) return []
  let q = supabase
    .from('producto_historial')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('creado_en', { ascending: false })
    .limit(opts?.limit ?? 100)
  if (opts?.productoId) q = q.eq('producto_id', opts.productoId)
  if (opts?.accion) q = q.eq('accion', opts.accion)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as HistorialEntry[]
}

export type AjusteStockInput = {
  productoId: string
  /** Positivo para ingreso, negativo para egreso. Respeta RN-55 (stock negativo si la empresa lo permite). */
  cantidad: number
  /** Motivo legible: 'conteo físico' | 'merma' | 'devolución' | 'otro'. */
  motivo: string
  /** Idempotencia: si se reintenta el mismo ajuste, usar el mismo id_evento. */
  idEvento?: string
}

/**
 * Ajuste de stock con motivo y auditoría (RN-11). Inserta un
 * `movimiento_inventario` y actualiza `stock_actual` vía RPC `aplicar_ajuste_stock`
 * (security invoker). El `cantidad` se envía como número (no string) para evitar
 * el mismatch cliente↔servidor de la deuda técnica de numeric.
 */
export async function aplicarAjusteStock(input: AjusteStockInput): Promise<void> {
  if (!supabase) {
    throw new Error('El ajuste de stock requiere conexión con la base de datos')
  }
  const empresaId = await obtenerMiEmpresaId()
  const usuarioId = await obtenerMiUsuarioId()
  if (!empresaId || !usuarioId) {
    throw new Error('No se pudo determinar la empresa o el usuario para el ajuste')
  }
  const idEvento =
    input.idEvento ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `ajuste-${Date.now()}-${Math.random()}`)
  const { error } = await supabase.rpc('aplicar_ajuste_stock', {
    p_id_evento: idEvento,
    p_empresa_id: empresaId,
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_tipo: mapearMotivoATipo(input.motivo),
    p_motivo: input.motivo,
    p_usuario_id: usuarioId,
  })
  if (error) throw error
}
