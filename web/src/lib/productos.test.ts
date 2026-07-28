import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calcularValuacion,
  aplicarAjusteStock,
  crearProducto,
  crearCategoria,
  subirImagenProducto,
  eliminarImagenProducto,
} from './productos'

const h = vi.hoisted(() => ({
  rpcArgs: null as Record<string, unknown> | null,
  rpcError: null as unknown,
  // Estado del mock de `from(...).insert(...)`. Capturamos el argumento real
  // del insert para garantizar cobertura del camino multi-tenant (los mocks
  // ciegos previos ocultaron el bug de empresa_id ausente).
  insertTable: null as string | null,
  insertArgs: null as Record<string, unknown> | null,
  insertError: null as unknown,
  // Empresa resuelta por el mock de ./empresa (mutable para test de nulo).
  empresaId: 'emp-x' as string | null,
  // Storage mock state
  uploadPath: null as string | null,
  uploadOptions: null as Record<string, unknown> | null,
  uploadError: null as unknown,
  removePaths: null as string[] | null,
  removeError: null as unknown,
}))

vi.mock('../lib/supabase', () => {
  const rpc = vi.fn((_name: string, args: Record<string, unknown>) => {
    h.rpcArgs = args
    return Promise.resolve({ error: h.rpcError })
  })
  const single = vi.fn(() =>
    Promise.resolve({
      data: { ...(h.insertArgs ?? {}), id: 'new-id', nombre: 'cat' },
      error: h.insertError,
    })
  )
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn((args: Record<string, unknown>) => {
    h.insertArgs = args
    return { select }
  })
  const from = vi.fn((table: string) => {
    h.insertTable = table
    return { insert }
  })

  const upload = vi.fn(async (path: string, _file: unknown, options?: Record<string, unknown>) => {
    h.uploadPath = path
    h.uploadOptions = options ?? null
    if (h.uploadError) return { data: null, error: h.uploadError }
    return { data: { path }, error: null }
  })
  const getPublicUrl = vi.fn((_path: string) => ({
    data: { publicUrl: `https://storage.example.com/productos/${_path}` },
  }))
  const remove = vi.fn(async (paths: string[]) => {
    h.removePaths = paths
    if (h.removeError) return { data: null, error: h.removeError }
    return { data: null, error: null }
  })
  const copy = vi.fn(async () => ({ data: null, error: null }))
  const storageFrom = vi.fn(() => ({ upload, getPublicUrl, remove, copy }))
  const storage = { from: storageFrom }

  return { supabase: { rpc, from, storage } }
})

vi.mock('../lib/empresa', () => ({
  obtenerMiEmpresaId: async () => h.empresaId,
  obtenerMiUsuarioId: async () => 'usr-x',
}))

describe('calcularValuacion', () => {
  it('Σ costo×stock = 50 (A: 10×3, B: 5×4)', () => {
    expect(
      calcularValuacion([
        { costo_usd: 10, stock_actual: 3 },
        { costo_usd: 5, stock_actual: 4 },
      ])
    ).toBe(50)
  })
})

describe('aplicarAjusteStock (RPC aplicar_ajuste_stock)', () => {
  beforeEach(() => {
    h.rpcArgs = null
    h.rpcError = null
  })

  it('ajuste positivo "conteo físico" => RPC tipo ajuste + motivo', async () => {
    await aplicarAjusteStock({ productoId: 'p1', cantidad: 10, motivo: 'conteo físico' })
    expect(h.rpcArgs).toMatchObject({
      p_tipo: 'ajuste',
      p_motivo: 'conteo físico',
      p_cantidad: 10,
      p_producto_id: 'p1',
      p_empresa_id: 'emp-x',
      p_usuario_id: 'usr-x',
    })
  })

  it('merma => tipo merma', async () => {
    await aplicarAjusteStock({ productoId: 'p2', cantidad: -3, motivo: 'merma' })
    expect(h.rpcArgs?.p_tipo).toBe('merma')
  })

  it('lanza si la RPC devuelve error', async () => {
    h.rpcError = { message: 'boom' }
    await expect(
      aplicarAjusteStock({ productoId: 'p3', cantidad: 1, motivo: 'otro' })
    ).rejects.toBeTruthy()
  })
})

describe('crearProducto (aislamiento multi-tenant)', () => {
  beforeEach(() => {
    h.insertTable = null
    h.insertArgs = null
    h.insertError = null
    h.empresaId = 'emp-x'
  })

  it('inserta en "producto" con empresa_id definido y no vacío', async () => {
    const prod = await crearProducto({ nombre: 'Tornillo', unidad: 'unidad' })
    expect(h.insertTable).toBe('producto')
    expect(h.insertArgs).toBeTruthy()
    const empresaId = (h.insertArgs as Record<string, unknown>).empresa_id
    expect(empresaId).toBe('emp-x')
    expect(empresaId).toBeTruthy()
    expect(typeof empresaId).toBe('string')
    // El alta exitosa devuelve el registro insertado.
    expect(prod.id).toBe('new-id')
  })

  it('lanza y NO inserta si no hay empresa_id', async () => {
    h.empresaId = null
    h.insertArgs = null
    await expect(
      crearProducto({ nombre: 'Sin empresa', unidad: 'unidad' })
    ).rejects.toThrow(/empresa/i)
    // No se debe haber llamado al insert (falló antes por validación).
    expect(h.insertArgs).toBeNull()
  })
})

describe('crearCategoria (aislamiento multi-tenant)', () => {
  beforeEach(() => {
    h.insertTable = null
    h.insertArgs = null
    h.insertError = null
    h.empresaId = 'emp-x'
  })

  it('inserta en "categoria" con empresa_id definido y no vacío', async () => {
    const cat = await crearCategoria('Herramientas')
    expect(h.insertTable).toBe('categoria')
    expect(h.insertArgs).toBeTruthy()
    const empresaId = (h.insertArgs as Record<string, unknown>).empresa_id
    expect(empresaId).toBe('emp-x')
    expect(empresaId).toBeTruthy()
    expect(typeof empresaId).toBe('string')
    expect(cat.id).toBe('new-id')
  })

  it('lanza y NO inserta si no hay empresa_id', async () => {
    h.empresaId = null
    h.insertArgs = null
    await expect(crearCategoria('Sin empresa')).rejects.toThrow(/empresa/i)
    expect(h.insertArgs).toBeNull()
  })
})

describe('subirImagenProducto (UUID-based path)', () => {
  let origImage: typeof Image | undefined
  let origCreateElement: typeof document.createElement | undefined

  beforeEach(() => {
    h.uploadPath = null
    h.uploadOptions = null
    h.uploadError = null

    // Mock Image + canvas for convertirAWebp (browser API)
    origImage = globalThis.Image
    origCreateElement = document.createElement.bind(document)

    const fakeBlob = new Blob(['webp-data'], { type: 'image/webp' })
    // @ts-expect-error — test mock
    globalThis.Image = class {
      onload: (() => void) | null = null
      naturalWidth = 100
      naturalHeight = 100
      set src(_v: string) {
        // Simulate async load
        setTimeout(() => this.onload?.(), 0)
      }
    }
    const mockCtx = {
      drawImage: vi.fn(),
      // @ts-expect-error — test mock
      getImageData: vi.fn(),
    }
    document.createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => mockCtx),
          toBlob: (cb: (blob: Blob | null) => void, _type: string, _quality: number) => {
            cb(fakeBlob)
          },
        } as unknown as HTMLCanvasElement
      }
      return origCreateElement!(tag)
    }) as typeof document.createElement
  })

  afterEach(() => {
    if (origImage) globalThis.Image = origImage
    if (origCreateElement) document.createElement = origCreateElement
  })

  it('usa path empresaId/productoId.webp (no SKU)', async () => {
    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    const url = await subirImagenProducto(file, 'emp-001', 'prod-abc')
    expect(h.uploadPath).toBe('emp-001/prod-abc.webp')
    expect(url).toContain('emp-001/prod-abc.webp')
  })

  it('envía upsert: true y contentType image/webp', async () => {
    const file = new File(['fake'], 'test.png', { type: 'image/png' })
    await subirImagenProducto(file, 'emp-002', 'prod-xyz')
    expect(h.uploadOptions).toMatchObject({
      upsert: true,
      contentType: 'image/webp',
    })
  })

  it('lanza si storage devuelve error', async () => {
    h.uploadError = { message: 'quota exceeded' }
    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    await expect(subirImagenProducto(file, 'emp-001', 'prod-fail')).rejects.toThrow()
  })
})

describe('eliminarImagenProducto (UUID-based path)', () => {
  beforeEach(() => {
    h.removePaths = null
    h.removeError = null
  })

  it('elimina archivo empresaId/productoId.webp', async () => {
    await eliminarImagenProducto('emp-001', 'prod-abc')
    expect(h.removePaths).toEqual(['emp-001/prod-abc.webp'])
  })

  it('ignora error 404 (resource not found)', async () => {
    h.removeError = { message: 'The resource was not found' }
    await expect(eliminarImagenProducto('emp-001', 'prod-gone')).resolves.toBeUndefined()
    expect(h.removePaths).toEqual(['emp-001/prod-gone.webp'])
  })

  it('lanza si el error no es 404', async () => {
    h.removeError = { message: 'Permission denied' }
    await expect(eliminarImagenProducto('emp-001', 'prod-err')).rejects.toThrow()
  })
})
