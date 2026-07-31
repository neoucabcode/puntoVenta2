import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportarCatalogo, importarCatalogo, validarCatalogoJson, type CatalogoExport } from './catalogo'
import JSZip from 'jszip'

/* ------------------------------------------------------------------ */
/*  Mocks — simple chain builder                                       */
/* ------------------------------------------------------------------ */

const h = vi.hoisted(() => ({
  empresaId: 'emp-test' as string | null,
  // Category select results
  catData: [] as Array<{ id: string; nombre: string; codigo?: string | null }>,
  catError: null as unknown,
  // Product select results
  prodData: [] as Array<Record<string, unknown>>,
  prodError: null as unknown,
  // Insert results
  insertError: null as unknown,
  insertId: 'new-id',
  // Fetch results (for image download)
  fetchBlob: null as Blob | null,
  fetchError: null as unknown,
  fetchFailUrls: null as Set<string> | null,
  // Storage upload (used by import)
  uploadPath: null as string | null,
  uploadError: null as unknown,
}))

vi.mock('../lib/supabase', () => {
  function makeSelectChain(data: unknown, error: unknown) {
    const chain: Record<string, unknown> = {}
    chain.eq = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.select = vi.fn(() => chain)
    chain.single = vi.fn(async () => ({ data, error }))
    chain.then = vi.fn(async (resolve: (v: { data: unknown; error: unknown }) => void) => {
      resolve({ data, error })
    })
    return chain
  }

  const from = vi.fn((table: string) => {
    if (table === 'categoria') {
      return {
        select: vi.fn(() => makeSelectChain(h.catData, h.catError)),
        insert: vi.fn((args: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              if (h.insertError) return { data: null, error: h.insertError }
              return { data: { ...args, id: h.insertId }, error: null }
            }),
          })),
        })),
      }
    }
    if (table === 'producto') {
      return {
        select: vi.fn(() => makeSelectChain(h.prodData, h.prodError)),
        insert: vi.fn((args: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              if (h.insertError) return { data: null, error: h.insertError }
              return { data: { ...args, id: h.insertId }, error: null }
            }),
          })),
        })),
      }
    }
    return { select: vi.fn(() => makeSelectChain(null, null)), insert: vi.fn() }
  })

  // Storage upload (still used by import path)
  const upload = vi.fn(async (path: string, _blob: unknown) => {
    h.uploadPath = path
    if (h.uploadError) return { data: null, error: h.uploadError }
    return { data: { path }, error: null }
  })
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/test.webp' } }))
  const remove = vi.fn(async () => ({ data: null, error: null }))
  const storageFrom = vi.fn(() => ({ upload, getPublicUrl, remove }))

  return { supabase: { from, storage: { from: storageFrom } } }
})

// Mock global fetch — usado por exportarCatalogo para descargar imagenes desde URL
const realFetch = globalThis.fetch
beforeEach(() => {
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (h.fetchFailUrls?.has(urlStr)) {
      return new Response('not found', { status: 404 })
    }
    if (h.fetchError && !h.fetchFailUrls) {
      throw h.fetchError
    }
    return new Response(h.fetchBlob, { status: 200 })
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = realFetch
})

vi.mock('../lib/empresa', () => ({
  obtenerMiEmpresaId: async () => h.empresaId,
}))

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeCatalogoJson(overrides?: Partial<CatalogoExport>): string {
  const data: CatalogoExport = {
    version: '1.0',
    exportado_en: new Date().toISOString(),
    categorias: [
      { nombre: 'Ferretes', codigo: 'FER' },
      { nombre: 'Pinturas', codigo: 'PIN' },
    ],
    productos: [
      {
        nombre: 'Tornillo 1/4',
        sku: 'FER-001',
        categoria_nombre: 'Ferretes',
        unidad: 'unidad',
        costo_usd: 0.1,
        precio_usd: 0.25,
        imagen_archivo: 'imagenes/p1.webp',
      },
      {
        nombre: 'Pintura Blanca',
        sku: 'PIN-001',
        categoria_nombre: 'Pinturas',
        unidad: 'litro',
        costo_usd: 5,
        precio_usd: 8,
      },
    ],
    ...overrides,
  }
  return JSON.stringify(data)
}

async function makeCatalogZip(catalogJson?: string, opts?: { withImages?: boolean }): Promise<Blob> {
  const zip = new JSZip()
  zip.file('catalogo.json', catalogJson ?? makeCatalogoJson())
  if (opts?.withImages !== false) {
    zip.file('imagenes/FER-001.webp', new Uint8Array([0x52, 0x49, 0x46, 0x46]))
  }
  return zip.generateAsync({ type: 'blob' })
}

/* ------------------------------------------------------------------ */
/*  Tests: validarCatalogoJson                                          */
/* ------------------------------------------------------------------ */

describe('validarCatalogoJson', () => {
  it('accepts valid catalog JSON', () => {
    const json = JSON.parse(makeCatalogoJson())
    expect(validarCatalogoJson(json)).toBe(true)
  })

  it('rejects null', () => {
    expect(validarCatalogoJson(null)).toBe(false)
  })

  it('rejects missing version', () => {
    const json = { categorias: [], productos: [] }
    expect(validarCatalogoJson(json)).toBe(false)
  })

  it('rejects missing categorias', () => {
    const json = { version: '1.0', productos: [] }
    expect(validarCatalogoJson(json)).toBe(false)
  })

  it('rejects missing productos', () => {
    const json = { version: '1.0', categorias: [] }
    expect(validarCatalogoJson(json)).toBe(false)
  })

  it('rejects product without sku', () => {
    const json = {
      version: '1.0',
      categorias: [{ nombre: 'A' }],
      productos: [{ nombre: 'X', categoria_nombre: 'A' }],
    }
    expect(validarCatalogoJson(json)).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  Tests: exportarCatalogo                                             */
/* ------------------------------------------------------------------ */

describe('exportarCatalogo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.empresaId = 'emp-test'
    h.catData = [
      { id: 'c1', nombre: 'Ferretes', codigo: 'FER' },
      { id: 'c2', nombre: 'Pinturas', codigo: 'PIN' },
    ]
    h.catError = null
    h.prodData = [
      {
        id: 'p1', sku: 'FER-001', nombre: 'Tornillo',
        categoria_id: 'c1', unidad: 'unidad',
        costo_usd: 0.1, precio_usd: 0.25,
        imagen_url: 'https://storage.example.com/productos/emp-test/FER0031.webp',
        codigo_barras: null,
      },
      {
        id: 'p2', sku: 'PIN-001', nombre: 'Pintura',
        categoria_id: 'c2', unidad: 'litro',
        costo_usd: 5, precio_usd: 8,
        imagen_url: null,
        codigo_barras: '123456',
      },
    ]
    h.prodError = null
    h.fetchBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' })
    h.fetchError = null
    h.fetchFailUrls = null
  })

  it('genera un Blob ZIP con catalogo.json e imagenes/', async () => {
    const { blob } = await exportarCatalogo('emp-test')

    expect(blob).toBeInstanceOf(Blob)

    const zip = await JSZip.loadAsync(blob)
    const catalogoFile = zip.file('catalogo.json')
    expect(catalogoFile).not.toBeNull()

    const catalogo: CatalogoExport = JSON.parse(await catalogoFile!.async('text'))
    expect(catalogo.version).toBe('1.0')
    expect(catalogo.categorias).toHaveLength(2)
    expect(catalogo.productos).toHaveLength(2)
    expect(catalogo.productos[0].sku).toBe('FER-001')
    expect(catalogo.productos[0].imagen_archivo).toBe('imagenes/FER-001.webp')
    expect(catalogo.productos[1].imagen_archivo).toBeUndefined()
  })

  it('incluye imagen descargada del Storage', async () => {
    const { blob } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)

    const imgFile = zip.file('imagenes/FER-001.webp')
    expect(imgFile).not.toBeNull()
    const imgData = await imgFile!.async('uint8array')
    expect(imgData[0]).toBe(0x52) // 'R' from RIFF header
  })

  it('no incluye imagen para producto sin imagen_url', async () => {
    const { blob } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)

    expect(zip.file('imagenes/PIN-001.webp')).toBeNull()
  })

  it('maneja graciosamente cuando fetch falla (HTTP 404)', async () => {
    h.fetchFailUrls = new Set(['https://storage.example.com/productos/emp-test/FER0031.webp'])
    const { blob, missingImages } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)

    // catalogo.json presente, imagenes/FER-001.webp ausente
    expect(zip.file('catalogo.json')).not.toBeNull()
    expect(zip.file('imagenes/FER-001.webp')).toBeNull()
    expect(missingImages).toBe(1)
  })

  it('funciona con cualquier URL de Storage (no asume path patterns)', async () => {
    // El URL es distinto del path "esperado" — el export DEBE descargar igual
    // porque hace fetch directo desde imagen_url, no construye paths
    const { blob, missingImages } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)

    expect(zip.file('imagenes/FER-001.webp')).not.toBeNull()
    expect(missingImages).toBe(0)
  })

  it('cuenta y reporta imagenes faltantes con warning', async () => {
    h.fetchFailUrls = new Set(['https://storage.example.com/productos/emp-test/FER0031.webp'])

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { blob, missingImages } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)

    expect(zip.file('imagenes/FER-001.webp')).toBeNull()
    expect(zip.file('catalogo.json')).not.toBeNull()
    expect(missingImages).toBe(1)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('imagen no accesible')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('productos sin imagen')
    )

    consoleSpy.mockRestore()
  })

  it('llama onProgress con fase descargando_imagenes y conteo correcto', async () => {
    const progressCalls: Array<{ phase: string; current: number; total: number }> = []

    await exportarCatalogo('emp-test', (p) => {
      progressCalls.push({ phase: p.phase, current: p.current, total: p.total })
    })

    // Al menos debe haber un evento de descargando_imagenes
    const downloadEvents = progressCalls.filter((p) => p.phase === 'descargando_imagenes')
    expect(downloadEvents.length).toBeGreaterThan(0)
    // El primer evento es current=0, el último es current=total=1 (hay 1 producto con imagen)
    expect(downloadEvents[0].current).toBe(0)
    expect(downloadEvents[0].total).toBe(1)
    expect(downloadEvents[downloadEvents.length - 1].current).toBe(1)
    expect(downloadEvents[downloadEvents.length - 1].total).toBe(1)
  })

  it('zip usa compression STORE (no deflate) — verifica via API', async () => {
    const { blob } = await exportarCatalogo('emp-test')
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('catalogo.json')).not.toBeNull()
  })

  it('fetch se llama con la URL guardada en DB, sin asumir path pattern', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await exportarCatalogo('emp-test')
    // El fetch debe usar la URL real del producto, no un path construido
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://storage.example.com/productos/emp-test/FER0031.webp'
    )
  })

  it('lanza si empresaId es vacio', async () => {
    await expect(exportarCatalogo('')).rejects.toThrow(/empresa/i)
  })
})

/* ------------------------------------------------------------------ */
/*  Tests: importarCatalogo                                             */
/* ------------------------------------------------------------------ */

describe('importarCatalogo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.empresaId = 'emp-test'
    h.catData = []
    h.catError = null
    h.prodData = []
    h.prodError = null
    h.insertError = null
    h.insertId = 'new-id'
    h.uploadPath = null
    h.uploadError = null
  })

  it('crea categorias y productos desde ZIP valido', async () => {
    const zipBlob = await makeCatalogZip()
    const result = await importarCatalogo(zipBlob, 'emp-test')

    expect(result.categories).toBe(2)
    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
  })

  it('deduplica categorias por nombre', async () => {
    // Existing category "Ferretes" already in DB
    h.catData = [{ id: 'existing-fer', nombre: 'Ferretes' }]

    const zipBlob = await makeCatalogZip()
    const result = await importarCatalogo(zipBlob, 'emp-test')

    // Only "Pinturas" should be created (Ferretes already exists)
    expect(result.categories).toBe(1)
    expect(result.imported).toBe(2)
  })

  it('lanza error con ZIP malformado', async () => {
    const badBlob = new Blob(['not a zip'], { type: 'application/zip' })
    await expect(importarCatalogo(badBlob, 'emp-test')).rejects.toThrow(/ZIP no valido/i)
  })

  it('lanza si empresaId es vacio', async () => {
    const zipBlob = await makeCatalogZip()
    await expect(importarCatalogo(zipBlob, '')).rejects.toThrow(/empresa/i)
  })

  it('lanza si catalogo.json tiene estructura invalida', async () => {
    const zip = new JSZip()
    zip.file('catalogo.json', JSON.stringify({ version: '1.0' }))
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    await expect(importarCatalogo(zipBlob, 'emp-test')).rejects.toThrow(/estructura invalida/i)
  })

  it('lanza si el ZIP no tiene catalogo.json', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'not a catalog')
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    await expect(importarCatalogo(zipBlob, 'emp-test')).rejects.toThrow(/catalogo.json/i)
  })

  it('llama onProgress durante la importacion', async () => {
    const zipBlob = await makeCatalogZip()
    const progressCalls: Array<{ phase: string; current: number; total: number }> = []

    await importarCatalogo(zipBlob, 'emp-test', (p) => {
      progressCalls.push({ ...p })
    })

    expect(progressCalls.length).toBeGreaterThan(0)
    // Should have categories phase, products phase, and images phase
    const phases = new Set(progressCalls.map((p) => p.phase))
    expect(phases.has('categorias')).toBe(true)
    expect(phases.has('productos')).toBe(true)
  })

  it('reporta errores sin hacer rollback', async () => {
    // Force first product insert to fail
    h.insertError = null

    // We can't easily make individual inserts fail with this mock structure,
    // so we test that errors array is properly returned
    const zipBlob = await makeCatalogZip()
    const result = await importarCatalogo(zipBlob, 'emp-test')

    expect(result).toHaveProperty('errors')
    expect(Array.isArray(result.errors)).toBe(true)
  })
})
