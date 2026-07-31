import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('regenerarSkusEnLote', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when supabase is null (requires DB connection)', async () => {
    vi.doMock('../lib/supabase', () => ({ supabase: null }))
    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { regenerarSkusEnLote } = await import('../lib/sku')
    await expect(regenerarSkusEnLote('emp-1')).rejects.toThrow(/conex/i)
  })

  it('calls regenerar_sku_lote RPC with p_empresa_id', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: { regenerados: 5, errores: [] },
      error: null,
    })

    vi.doMock('../lib/supabase', () => ({
      supabase: { rpc: rpcMock },
    }))
    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { regenerarSkusEnLote } = await import('../lib/sku')
    const result = await regenerarSkusEnLote('emp-1')

    expect(rpcMock).toHaveBeenCalledWith('regenerar_sku_lote', {
      p_empresa_id: 'emp-1',
    })
    expect(result.regenerados).toBe(5)
    expect(result.errores).toEqual([])
  })

  it('parses array response (PostgREST can return array or single row)', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [{ regenerados: 3, errores: [{ producto_id: 'p1', error: 'fail' }] }],
      error: null,
    })

    vi.doMock('../lib/supabase', () => ({
      supabase: { rpc: rpcMock },
    }))
    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { regenerarSkusEnLote } = await import('../lib/sku')
    const result = await regenerarSkusEnLote('emp-1')

    expect(result.regenerados).toBe(3)
    expect(result.errores).toEqual([{ producto_id: 'p1', error: 'fail' }])
  })

  it('handles null data gracefully', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    vi.doMock('../lib/supabase', () => ({
      supabase: { rpc: rpcMock },
    }))
    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { regenerarSkusEnLote } = await import('../lib/sku')
    const result = await regenerarSkusEnLote('emp-1')

    expect(result.regenerados).toBe(0)
    expect(result.errores).toEqual([])
  })

  it('throws on RPC error', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Solo administradores pueden regenerar SKUs' },
    })

    vi.doMock('../lib/supabase', () => ({
      supabase: { rpc: rpcMock },
    }))
    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { regenerarSkusEnLote } = await import('../lib/sku')
    await expect(regenerarSkusEnLote('emp-1')).rejects.toThrow(/administradores/i)
  })
})
