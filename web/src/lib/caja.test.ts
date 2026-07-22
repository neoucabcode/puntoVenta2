import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceId, abrirCaja, obtenerCajaActual } from './caja'

describe('caja.ts', () => {
  beforeEach(() => {
    localStorage.removeItem('pv-device-id')
  })

  it('getDeviceId es estable entre llamadas (persistido en localStorage)', () => {
    const a = getDeviceId()
    const b = getDeviceId()
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f-]{8,}$/i)
  })

  // RN-53: sin cliente Supabase (entorno de test) la caja opera "sin caja" -> null.
  it('abrirCaja devuelve null sin cliente Supabase (RN-53)', async () => {
    const sesion = await abrirCaja('0')
    expect(sesion).toBeNull()
  })

  it('obtenerCajaActual devuelve null sin cliente Supabase', async () => {
    const actual = await obtenerCajaActual('disp-test')
    expect(actual).toBeNull()
  })
})
