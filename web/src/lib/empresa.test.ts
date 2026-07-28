import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obtenerMiRol, actualizarMiEmpresa, limpiarCacheEmpresa } from './empresa'

const h = vi.hoisted(() => ({
  state: { rol: 'admin' as string | null, user: { id: 'u1' } as unknown, empresaId: 'emp-001' as string | null },
  updateCalls: [] as Array<{ table: string; payload: unknown }>,
}))

vi.mock('../lib/supabase', () => {
  // For empresa table
  const empresaSingle = vi.fn(() =>
    Promise.resolve({
      data: h.state.rol === undefined ? null : { rol: h.state.rol },
      error: null,
    })
  )
  const empresaEq = vi.fn(() => ({ single: empresaSingle }))
  const empresaSelect = vi.fn(() => ({ eq: empresaEq }))
  const update = vi.fn((payload: unknown) => {
    h.updateCalls.push({ table: 'empresa', payload })
    return { eq: vi.fn(() => Promise.resolve({ error: null })) }
  })

  // For usuario table — needs to handle both .select('rol') and .select('empresa_id')
  const usuarioEqRol = vi.fn(() => ({
    single: vi.fn(() =>
      Promise.resolve({
        data: h.state.rol === undefined ? null : { rol: h.state.rol },
        error: null,
      })
    ),
  }))
  const usuarioEqEmpresa = vi.fn(() => ({
    single: vi.fn(() =>
      Promise.resolve({
        data: h.state.empresaId ? { empresa_id: h.state.empresaId } : null,
        error: null,
      })
    ),
  }))
  const usuarioSelect = vi.fn((col: string) => ({
    eq: col === 'empresa_id' ? usuarioEqEmpresa : usuarioEqRol,
  }))

  const from = vi.fn((table: string) => {
    if (table === 'usuario') return { select: usuarioSelect }
    return { select: empresaSelect, update }
  })
  const getUser = vi.fn(() => Promise.resolve({ data: { user: h.state.user } }))
  return { supabase: { auth: { getUser }, from } }
})

describe('obtenerMiRol', () => {
  beforeEach(() => {
    h.state = { rol: 'admin', user: { id: 'u1' }, empresaId: 'emp-001' }
    limpiarCacheEmpresa()
  })

  it('devuelve el rol admin', async () => {
    expect(await obtenerMiRol()).toBe('admin')
  })

  it('devuelve el rol cajero', async () => {
    h.state.rol = 'cajero'
    expect(await obtenerMiRol()).toBe('cajero')
  })

  it('devuelve null sin sesión', async () => {
    h.state.user = null
    expect(await obtenerMiRol()).toBeNull()
  })

  it('devuelve null si usuario.rol es null', async () => {
    h.state.rol = null
    expect(await obtenerMiRol()).toBeNull()
  })
})

describe('actualizarMiEmpresa', () => {
  beforeEach(() => {
    h.updateCalls = []
    h.state.empresaId = 'emp-001'
    limpiarCacheEmpresa()
  })

  it('actualiza tasa_activa via Supabase', async () => {
    await actualizarMiEmpresa({ tasa_activa: 36.5 })
    expect(h.updateCalls).toHaveLength(1)
    expect(h.updateCalls[0].payload).toMatchObject({ tasa_activa: 36.5 })
  })

  it('actualiza múltiples campos parciales', async () => {
    await actualizarMiEmpresa({ igtf_habilitado: true, venta_sin_stock: true })
    expect(h.updateCalls).toHaveLength(1)
    expect(h.updateCalls[0].payload).toMatchObject({
      igtf_habilitado: true,
      venta_sin_stock: true,
    })
  })

  it('lanza error si Supabase falla', async () => {
    const { supabase } = await import('../lib/supabase')
    const originalFrom = supabase!.from
    ;(supabase as any).from = vi.fn(() => ({
      update: () => ({ eq: () => Promise.resolve({ error: { message: 'fail' } }) }),
    }))
    await expect(actualizarMiEmpresa({ tasa_activa: 1 })).rejects.toThrow()
    ;(supabase as any).from = originalFrom
  })
})
