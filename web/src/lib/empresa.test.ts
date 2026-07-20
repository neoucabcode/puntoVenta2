import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obtenerMiRol } from './empresa'

const h = vi.hoisted(() => ({
  state: { rol: 'admin' as string | null, user: { id: 'u1' } as unknown },
}))

vi.mock('../lib/supabase', () => {
  const single = vi.fn(() =>
    Promise.resolve({
      data: h.state.rol === undefined ? null : { rol: h.state.rol },
      error: null,
    })
  )
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const getUser = vi.fn(() => Promise.resolve({ data: { user: h.state.user } }))
  return { supabase: { auth: { getUser }, from } }
})

describe('obtenerMiRol', () => {
  beforeEach(() => {
    h.state = { rol: 'admin', user: { id: 'u1' } }
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
