import { supabase } from './supabase'

export type Producto = {
  id: string
  codigo_barras: string | null
  sku: string | null
  nombre: string
  categoria_id: string | null
  unidad: string
  costo_usd: number
  precio_usd: number
  imagen_url: string | null
  stock_actual: number
  stock_minimo: number
  activo: boolean
}

export const PAGE_SIZE = 50

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
  const limit = opts?.pageSize ?? PAGE_SIZE
  const from = opts?.offset ?? 0
  const to = from + limit - 1
  let q = supabase
    .from('producto')
    .select('*, categoria:categoria_id(id,nombre)', { count: 'exact' })
    .order('nombre', { ascending: true })
    .range(from, to)
  if (opts?.soloActivos) q = q.eq('activo', true)
  if (opts?.categoriaId) q = q.eq('categoria_id', opts.categoriaId)
  if (opts?.search) {
    const s = opts.search.trim()
    if (s) {
      const tokens = s.split(/\s+/).filter(Boolean)
      const condiciones: string[] = []
      for (const t of tokens) {
        const like = `%${t}%`
        const prefijo = `${t}%`
        // Prefijo de palabra primero (la palabra empieza con el token), luego
        // substring (el token aparece en cualquier parte de nombre/sku/codigo).
        condiciones.push(
          `nombre.ilike.${prefijo}`,
          `sku.ilike.${prefijo}`,
          `codigo_barras.ilike.${prefijo}`,
          `nombre.ilike.${like}`,
          `sku.ilike.${like}`,
          `codigo_barras.ilike.${like}`
        )
      }
      q = q.or(condiciones.join(','))
    }
  }
  const { data, error, count } = await q
  if (error) throw error
  const items = (data ?? []) as ProductoJoin[]
  const total = count ?? 0
  const hasMore = from + items.length < total
  return { items, hasMore }
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categoria')
    .select('id,nombre')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function crearProducto(input: ProductoInput): Promise<Producto> {
  const { data, error } = await supabase
    .from('producto')
    .insert({
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
  const { error } = await supabase
    .from('producto')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

export async function reactivarProducto(id: string): Promise<void> {
  const { error } = await supabase
    .from('producto')
    .update({ activo: true })
    .eq('id', id)
  if (error) throw error
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categoria')
    .insert({ nombre })
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
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
  const path = `${empresaId}/${productoId}.${ext}`
  const { error } = await supabase.storage
    .from('productos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('productos').getPublicUrl(path)
  return data.publicUrl
}

export async function obtenerMiEmpresaId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('usuario')
    .select('empresa_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()
  if (error) return null
  return (data?.empresa_id as string) ?? null
}

export async function verificarSkuDuplicado(
  sku: string | null,
  ignorarId?: string | null
): Promise<boolean> {
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
