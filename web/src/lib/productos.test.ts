import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calcularValuacion,
  aplicarAjusteStock,
  crearProducto,
  crearCategoria,
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
  return { supabase: { rpc, from } }
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
