import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcularValuacion, aplicarAjusteStock } from './productos'

const h = vi.hoisted(() => ({ rpcArgs: null as Record<string, unknown> | null, rpcError: null as unknown }))

vi.mock('../lib/supabase', () => {
  const rpc = vi.fn((_name: string, args: Record<string, unknown>) => {
    h.rpcArgs = args
    return Promise.resolve({ error: h.rpcError })
  })
  return { supabase: { rpc } }
})

vi.mock('../lib/empresa', () => ({
  obtenerMiEmpresaId: async () => 'emp-x',
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
