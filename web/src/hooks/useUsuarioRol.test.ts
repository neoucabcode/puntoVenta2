import { describe, it, expect, vi } from 'vitest'
import { resolverAccesoInventario } from './useUsuarioRol'

describe('resolverAccesoInventario (gate de Inventario)', () => {
  it('admin => habilitado', () => {
    expect(resolverAccesoInventario('admin')).toEqual({
      esAdmin: true,
      inventarioHabilitado: true,
    })
  })

  it('cajero => denegado', () => {
    expect(resolverAccesoInventario('cajero')).toEqual({
      esAdmin: false,
      inventarioHabilitado: false,
    })
  })

  it('auditor => denegado', () => {
    expect(resolverAccesoInventario('auditor')).toEqual({
      esAdmin: false,
      inventarioHabilitado: false,
    })
  })

  it('rol null en DEV => fallback admin', () => {
    expect(resolverAccesoInventario(null, { dev: true })).toEqual({
      esAdmin: true,
      inventarioHabilitado: true,
    })
  })

  it('rol null en PRODUCCIÓN => denegado (rol debe ser explícito)', () => {
    expect(resolverAccesoInventario(null, { dev: false })).toEqual({
      esAdmin: false,
      inventarioHabilitado: false,
    })
  })

  it('kill-switch false desactiva aunque sea admin', () => {
    expect(resolverAccesoInventario('admin', { killSwitch: false })).toEqual({
      esAdmin: true,
      inventarioHabilitado: false,
    })
  })

  it('null en DEV con kill-switch false => denegado', () => {
    expect(resolverAccesoInventario(null, { dev: true, killSwitch: false })).toEqual({
      esAdmin: true,
      inventarioHabilitado: false,
    })
  })

  it('loguea warning en fallback de desarrollo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resolverAccesoInventario(null, { dev: true })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
