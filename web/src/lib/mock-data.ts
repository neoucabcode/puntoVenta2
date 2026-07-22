import type { Session, User } from '@supabase/supabase-js'

type MockUser = {
  id: string
  email: string
  password: string
  nombre: string
  rol: string
}

type MockCompany = {
  id: string
  nombre: string
  tasa_activa: number
  igtf_habilitado: boolean
  caja_obligatoria: boolean
  venta_sin_stock: boolean
  stock_negativo: boolean
}

type MockCategoria = {
  id: string
  nombre: string
}

type MockProducto = {
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

type ImportProductInput = Partial<MockProducto> & {
  categoria?: string
  categoria_nombre?: string
  categoria_id?: string
  nombre?: string
  sku?: string | null
  codigo_barras?: string | null
  precio_usd?: number | string | null
  costo_usd?: number | string | null
  stock_actual?: number | string | null
  stock_minimo?: number | string | null
  activo?: boolean | string | null
  imagen_url?: string | null
}

type ImportCatalogPayload = {
  categories?: Array<{ id?: string; nombre: string }>
  products?: ImportProductInput[]
}

type MockState = {
  session: { access_token: string; user: User } | null
  companyId: string | null
  company: MockCompany | null
  users: Record<string, MockUser>
  products: MockProducto[]
  categories: MockCategoria[]
}

const STORAGE_KEY = 'pv-local-mock-v1'
const CATALOGO_IMPORT_FLAG = 'pv-local-catalog-imported-v1'
const DEMO_EMAIL = 'demo@local.test'
const DEMO_PASSWORD = 'demo123'
const DEMO_USER_ID = 'local-demo-user'
const DEMO_COMPANY_ID = 'local-demo-company'

const listeners: Array<(session: Session | null) => void> = []

function readState(): MockState {
  if (typeof window === 'undefined') {
    return emptyState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = emptyState()
    seeded.users[DEMO_EMAIL] = {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      nombre: 'Demo local',
      rol: 'admin',
    }
    seeded.categories = [
      { id: 'cat-herramientas', nombre: 'Herramientas' },
      { id: 'cat-electricidad', nombre: 'Electricidad' },
      { id: 'cat-fontaneria', nombre: 'Fontanería' },
    ]
    seeded.products = [
      { id: 'prod-1', codigo_barras: '750100000001', sku: 'SKU-001', nombre: 'Taladro 12V', categoria_id: 'cat-herramientas', unidad: 'unidad', costo_usd: 45, precio_usd: 79, imagen_url: 'https://images.unsplash.com/photo-1581147036324-b0f3a6f9b0d1?auto=format&fit=crop&w=800&q=80', stock_actual: 8, stock_minimo: 3, activo: true },
      { id: 'prod-2', codigo_barras: '750100000002', sku: 'SKU-002', nombre: 'Cable 2x1.5', categoria_id: 'cat-electricidad', unidad: 'rollo', costo_usd: 12, precio_usd: 18, imagen_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', stock_actual: 18, stock_minimo: 5, activo: true },
      { id: 'prod-3', codigo_barras: '750100000003', sku: 'SKU-003', nombre: 'Llave de paso', categoria_id: 'cat-fontaneria', unidad: 'unidad', costo_usd: 7, precio_usd: 11, imagen_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80', stock_actual: 3, stock_minimo: 2, activo: true },
      { id: 'prod-4', codigo_barras: '750100000004', sku: 'SKU-004', nombre: 'Martillo 16 oz', categoria_id: 'cat-herramientas', unidad: 'unidad', costo_usd: 18, precio_usd: 29, imagen_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80', stock_actual: 2, stock_minimo: 2, activo: true },
      { id: 'prod-5', codigo_barras: '750100000005', sku: 'SKU-005', nombre: 'Interruptor simple', categoria_id: 'cat-electricidad', unidad: 'unidad', costo_usd: 4, precio_usd: 7, imagen_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=800&q=80', stock_actual: 0, stock_minimo: 1, activo: true },
    ]
    seeded.company = {
      id: DEMO_COMPANY_ID,
      nombre: 'Ferretería Demo Local',
      tasa_activa: 1,
      igtf_habilitado: false,
      caja_obligatoria: true,
      venta_sin_stock: false,
      stock_negativo: false,
    }
    seeded.companyId = DEMO_COMPANY_ID
    persistState(seeded)
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as MockState
    const normalized = emptyState()
    normalized.session = parsed.session ?? null
    normalized.companyId = parsed.companyId ?? null
    normalized.company = parsed.company ?? null
    normalized.users = parsed.users ?? {}
    normalized.categories = parsed.categories ?? []
    normalized.products = parsed.products ?? []
    if (!normalized.users[DEMO_EMAIL]) {
      normalized.users[DEMO_EMAIL] = {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        nombre: 'Demo local',
        rol: 'admin',
      }
    }
    if (normalized.categories.length === 0) {
      normalized.categories = [
        { id: 'cat-herramientas', nombre: 'Herramientas' },
        { id: 'cat-electricidad', nombre: 'Electricidad' },
        { id: 'cat-fontaneria', nombre: 'Fontanería' },
      ]
    }
    if (normalized.products.length === 0) {
      normalized.products = [
        { id: 'prod-1', codigo_barras: '750100000001', sku: 'SKU-001', nombre: 'Taladro 12V', categoria_id: 'cat-herramientas', unidad: 'unidad', costo_usd: 45, precio_usd: 79, imagen_url: 'https://images.unsplash.com/photo-1581147036324-b0f3a6f9b0d1?auto=format&fit=crop&w=800&q=80', stock_actual: 8, stock_minimo: 3, activo: true },
        { id: 'prod-2', codigo_barras: '750100000002', sku: 'SKU-002', nombre: 'Cable 2x1.5', categoria_id: 'cat-electricidad', unidad: 'rollo', costo_usd: 12, precio_usd: 18, imagen_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', stock_actual: 18, stock_minimo: 5, activo: true },
        { id: 'prod-3', codigo_barras: '750100000003', sku: 'SKU-003', nombre: 'Llave de paso', categoria_id: 'cat-fontaneria', unidad: 'unidad', costo_usd: 7, precio_usd: 11, imagen_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80', stock_actual: 3, stock_minimo: 2, activo: true },
      ]
    }
    persistState(normalized)
    return normalized
  } catch {
    const seeded = emptyState()
    seeded.users[DEMO_EMAIL] = {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      nombre: 'Demo local',
      rol: 'admin',
    }
    persistState(seeded)
    return seeded
  }
}

function emptyState(): MockState {
  return {
    session: null,
    companyId: null,
    company: null,
    users: {},
    products: [],
    categories: [],
  }
}

function persistState(state: MockState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function notify(session: Session | null) {
  listeners.forEach((listener) => listener(session))
}

function toUser(user: MockUser): User {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { nombre: user.nombre, rol: user.rol },
    app_metadata: { role: user.rol },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User
}

export function subscribeMockAuth(listener: (session: Session | null) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index >= 0) listeners.splice(index, 1)
  }
}

export async function loginMock(email: string, password: string): Promise<User> {
  const state = readState()
  const user = state.users[email.toLowerCase()]
  if (!user || user.password !== password) {
    throw new Error('Credenciales inválidas en modo local')
  }
  const nextSession = {
    access_token: `mock-${user.id}`,
    user: toUser(user),
  }
  state.session = nextSession
  persistState(state)
  notify(nextSession as unknown as Session)
  return nextSession.user
}

export async function registroMock(email: string, password: string, nombre: string): Promise<User> {
  const state = readState()
  const normalizedEmail = email.toLowerCase()
  if (state.users[normalizedEmail]) {
    throw new Error('Ese correo ya existe en modo local')
  }
  const user: MockUser = {
    id: `mock-user-${Date.now()}`,
    email: normalizedEmail,
    password,
    nombre: nombre || 'Usuario local',
    rol: 'admin',
  }
  state.users[normalizedEmail] = user
  state.session = {
    access_token: `mock-${user.id}`,
    user: toUser(user),
  }
  persistState(state)
  notify(state.session as unknown as Session)
  return state.session.user
}

export async function logoutMock(): Promise<void> {
  const state = readState()
  state.session = null
  persistState(state)
  notify(null)
}

export async function crearEmpresaConAdminMock(nombreEmpresa: string, userId: string, nombreAdmin: string): Promise<void> {
  const state = readState()
  const user = Object.values(state.users).find((entry) => entry.id === userId)
  if (!user) throw new Error('Usuario no encontrado en modo local')
  if (!nombreEmpresa.trim()) throw new Error('El nombre de la empresa es obligatorio')
  const company: MockCompany = {
    id: `mock-company-${Date.now()}`,
    nombre: nombreEmpresa.trim(),
    tasa_activa: 1,
    igtf_habilitado: false,
    caja_obligatoria: true,
    venta_sin_stock: false,
    stock_negativo: false,
  }
  state.company = company
  state.companyId = company.id
  state.users[user.email].nombre = nombreAdmin || user.nombre
  state.users[user.email].rol = 'admin'
  persistState(state)
}

export function getMockSession(): Session | null {
  const state = readState()
  return (state.session as Session | null) ?? null
}

export function getMockEmpresa(): MockCompany | null {
  const state = readState()
  return state.company ?? null
}

export function getMockEmpresaId(): string | null {
  const state = readState()
  return state.companyId ?? null
}

export function getMockUsuarioId(): string | null {
  const state = readState()
  return state.session?.user?.id ?? null
}

export async function listarProductosMock(opts?: {
  search?: string
  categoriaId?: string | null
  soloActivos?: boolean
  offset?: number
  pageSize?: number
}): Promise<{ items: Array<MockProducto & { categoria: MockCategoria | null }>; hasMore: boolean }> {
  if (typeof window !== 'undefined' && window.localStorage.getItem(CATALOGO_IMPORT_FLAG) !== '1') {
    await autoImportarCatalogoLocal()
  }
  const state = readState()
  const search = (opts?.search ?? '').trim().toLowerCase()
  const categoriaId = opts?.categoriaId ?? null
  const soloActivos = opts?.soloActivos ?? true
  const offset = opts?.offset ?? 0
  const pageSize = opts?.pageSize ?? 50

  const filtered = state.products.filter((producto) => {
    if (soloActivos && !producto.activo) return false
    if (categoriaId && producto.categoria_id !== categoriaId) return false
    if (!search) return true
    const hayCoincidencia = [producto.nombre, producto.sku, producto.codigo_barras]
      .filter(Boolean)
      .some((value) => (value ?? '').toLowerCase().includes(search))
    return hayCoincidencia
  })

  const items = filtered.slice(offset, offset + pageSize).map((producto) => {
    const categoria = state.categories.find((item) => item.id === producto.categoria_id) ?? null
    return { ...producto, categoria }
  })

  return {
    items,
    hasMore: offset + items.length < filtered.length,
  }
}

export async function listarCategoriasMock(): Promise<MockCategoria[]> {
  if (typeof window !== 'undefined' && window.localStorage.getItem(CATALOGO_IMPORT_FLAG) !== '1') {
    await autoImportarCatalogoLocal()
  }
  const state = readState()
  return state.categories
}

export async function crearProductoMock(input: Partial<MockProducto>): Promise<MockProducto> {
  const state = readState()
  const producto: MockProducto = {
    id: `mock-prod-${Date.now()}`,
    codigo_barras: input.codigo_barras ?? null,
    sku: input.sku ?? null,
    nombre: input.nombre ?? 'Producto nuevo',
    categoria_id: input.categoria_id ?? null,
    unidad: input.unidad ?? 'unidad',
    costo_usd: input.costo_usd ?? 0,
    precio_usd: input.precio_usd ?? 0,
    imagen_url: input.imagen_url ?? null,
    stock_actual: input.stock_actual ?? 0,
    stock_minimo: input.stock_minimo ?? 0,
    activo: input.activo ?? true,
  }
  state.products.push(producto)
  persistState(state)
  return producto
}

export async function actualizarProductoMock(id: string, input: Partial<MockProducto>): Promise<MockProducto> {
  const state = readState()
  const index = state.products.findIndex((producto) => producto.id === id)
  if (index < 0) throw new Error('Producto no encontrado en modo local')
  state.products[index] = { ...state.products[index], ...input }
  persistState(state)
  return state.products[index]
}

export async function desactivarProductoMock(id: string): Promise<void> {
  const state = readState()
  const index = state.products.findIndex((producto) => producto.id === id)
  if (index >= 0) {
    state.products[index].activo = false
    persistState(state)
  }
}

export async function reactivarProductoMock(id: string): Promise<void> {
  const state = readState()
  const index = state.products.findIndex((producto) => producto.id === id)
  if (index >= 0) {
    state.products[index].activo = true
    persistState(state)
  }
}

export async function crearCategoriaMock(nombre: string): Promise<MockCategoria> {
  const state = readState()
  const categoria: MockCategoria = {
    id: `cat-${Date.now()}`,
    nombre: nombre.trim(),
  }
  state.categories.push(categoria)
  persistState(state)
  return categoria
}

export async function subirImagenProductoMock(file: File, _empresaId: string, productoId: string): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  const state = readState()
  const producto = state.products.find((entry) => entry.id === productoId)
  if (producto) {
    producto.imagen_url = objectUrl
    persistState(state)
  }
  return objectUrl
}

export async function verificarSkuDuplicadoMock(sku: string | null): Promise<boolean> {
  if (!sku) return false
  const state = readState()
  return state.products.some((producto) => producto.sku === sku)
}

export async function verificarCodigoDuplicadoMock(codigo: string | null): Promise<boolean> {
  if (!codigo) return false
  const state = readState()
  return state.products.some((producto) => producto.codigo_barras === codigo)
}

function sanitizeNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'si', 'sí', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  return true
}

function parseCsv(text: string): ImportCatalogPayload {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { products: [] }

  const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map((line) => {
    const values = line.match(/(?:"([^"]*)"|([^,]+))/g)?.map((value) => value.replace(/^"|"$/g, '').trim()) ?? []
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})
  })

  const products = rows.map((row) => {
    const categoria = row.categoria ?? row.categoria_nombre ?? row.categoria_id ?? ''
    return {
      nombre: row.nombre ?? row.producto ?? '',
      sku: row.sku ?? null,
      codigo_barras: row.codigo_barras ?? row.codigo ?? null,
      categoria: categoria || undefined,
      precio_usd: sanitizeNumber(row.precio_usd ?? row.precio ?? row.preciousd),
      costo_usd: sanitizeNumber(row.costo_usd ?? row.costo ?? row.costousd),
      stock_actual: sanitizeNumber(row.stock_actual ?? row.stock ?? row.stockactual),
      stock_minimo: sanitizeNumber(row.stock_minimo ?? row.stockminimo),
      unidad: row.unidad ?? 'unidad',
      activo: normalizeBoolean(row.activo ?? 'true'),
      imagen_url: row.imagen_url ?? row.imagen ?? row.image_url ?? null,
    }
  }).filter((product) => product.nombre)

  return { products }
}

function applyCatalogPayload(payload: ImportCatalogPayload): { imported: number; categories: number } {
  const state = readState()
  const categories = (payload.categories ?? []).map((category, index) => ({
    id: category.id ?? `cat-import-${index + 1}`,
    nombre: category.nombre.trim(),
  })).filter((category) => category.nombre)

  const products = (payload.products ?? []).map((item, index) => {
    const categoriaNombre = item.categoria_nombre ?? item.categoria ?? ''
    const categoriaId = item.categoria_id ?? null
    const categoria = categoriaId
      ? categories.find((entry) => entry.id === categoriaId) ?? null
      : categories.find((entry) => entry.nombre.toLowerCase() === categoriaNombre.toLowerCase()) ?? null

    const normalizedCategoryId = categoria?.id ?? (categoriaNombre ? `cat-import-${index + 1}` : null)
    if (categoriaNombre && !categoria) {
      categories.push({ id: normalizedCategoryId!, nombre: categoriaNombre.trim() })
    }

    return {
      id: item.id ?? `import-${Date.now()}-${index + 1}`,
      codigo_barras: item.codigo_barras ?? null,
      sku: item.sku ?? null,
      nombre: item.nombre?.trim() ?? 'Producto importado',
      categoria_id: normalizedCategoryId,
      unidad: item.unidad ?? 'unidad',
      costo_usd: sanitizeNumber(item.costo_usd),
      precio_usd: sanitizeNumber(item.precio_usd),
      imagen_url: item.imagen_url ?? null,
      stock_actual: sanitizeNumber(item.stock_actual),
      stock_minimo: sanitizeNumber(item.stock_minimo),
      activo: normalizeBoolean(item.activo ?? true),
    } satisfies MockProducto
  })

  state.categories = categories
  state.products = products
  persistState(state)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CATALOGO_IMPORT_FLAG, '1')
  }

  return { imported: products.length, categories: categories.length }
}

export async function importarCatalogoMock(file: File): Promise<{ imported: number; categories: number }> {
  const text = await file.text()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  let payload: ImportCatalogPayload

  if (extension === 'json') {
    payload = JSON.parse(text) as ImportCatalogPayload
  } else {
    payload = parseCsv(text)
  }

  return applyCatalogPayload(payload)
}

// --- Mocks para SKU configurable ---

type MockSkuConfig = {
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

const SKU_CONFIG_KEY = 'pv-local-sku-config-v1'

function getMockSkuConfig(empresaId: string): MockSkuConfig | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SKU_CONFIG_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, MockSkuConfig>
    return parsed[empresaId] ?? null
  } catch {
    return null
  }
}

function persistMockSkuConfig(empresaId: string, config: MockSkuConfig): void {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(SKU_CONFIG_KEY)
  const map: Record<string, MockSkuConfig> = raw ? JSON.parse(raw) : {}
  map[empresaId] = config
  window.localStorage.setItem(SKU_CONFIG_KEY, JSON.stringify(map))
}

export async function obtenerConfigSkuMock(empresaId: string): Promise<MockSkuConfig | null> {
  return getMockSkuConfig(empresaId)
}

export async function generarSkuMock(
  empresaId: string,
  _categoriaId?: string
): Promise<string | null> {
  const config = getMockSkuConfig(empresaId)
  if (!config || !config.autogenerar_activo) return null
  const counter = Math.floor(Math.random() * 9999) + 1
  const padded = String(counter).padStart(config.longitud_secuencial, '0')
  if (config.plantilla === 'prefijo_fijo_secuencial' && config.prefijo_manual) {
    return `${config.prefijo_manual}-${padded}`
  }
  if (config.plantilla === 'categoria_secuencial' && _categoriaId) {
    const catCode = _categoriaId.slice(0, 3).toUpperCase()
    return `${catCode}-${padded}`
  }
  return padded
}

export async function buscarProductosSimilaresMock(
  _empresaId: string,
  texto: string,
  _umbral?: number
): Promise<Array<{ id: string; nombre: string; sku: string; similitud: number }>> {
  const state = readState()
  if (!texto.trim()) return []
  const lower = texto.toLowerCase()
  return state.products
    .filter((p) => p.sku)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      sku: p.sku!,
      similitud: p.nombre.toLowerCase().includes(lower) ? 0.9 : 0.2,
    }))
    .filter((r) => r.similitud >= (_umbral ?? 0.3))
    .slice(0, 10)
}

export async function actualizarConfigSkuMock(
  empresaId: string,
  config: Partial<MockSkuConfig>
): Promise<void> {
  const existing = getMockSkuConfig(empresaId) ?? {
    id: `sku-config-${Date.now()}`,
    empresa_id: empresaId,
    autogenerar_activo: false,
    plantilla: 'solo_secuencial' as const,
    usa_categoria: false,
    modo_contador: 'global' as const,
    longitud_secuencial: 4,
    prefijo_manual: null,
    umbral_similitud: 0.3,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  }
  persistMockSkuConfig(empresaId, {
    ...existing,
    ...config,
    actualizado_en: new Date().toISOString(),
  })
}

export async function autoImportarCatalogoLocal(): Promise<{ imported: number; categories: number } | null> {
  if (typeof window === 'undefined') return null
  if (window.localStorage.getItem(CATALOGO_IMPORT_FLAG) === '1') return null

  try {
    const response = await fetch('/catalogo_importado.json')
    if (!response.ok) return null
    const payload = (await response.json()) as ImportCatalogPayload
    const result = applyCatalogPayload(payload)
    if (result.imported > 0) {
      window.localStorage.setItem(CATALOGO_IMPORT_FLAG, '1')
    }
    return result
  } catch {
    return null
  }
}
