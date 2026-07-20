import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { InventarioPage } from './InventarioPage'

const h = vi.hoisted(() => ({
  rol: { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false },
}))

vi.mock('../hooks/useUsuarioRol', () => ({
  useUsuarioRol: () => h.rol,
}))

describe('InventarioPage gate por rol', () => {
  it('admin ve CRUD + ajuste de stock + valuación', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InventarioPage />
      </MemoryRouter>
    )
    expect(html).toContain('Nuevo producto')
    expect(html).toContain('Ajuste de stock')
    expect(html).toContain('Valuación de inventario')
  })

  it('no-admin ve acceso restringido y sin controles de edición', () => {
    h.rol = { rol: 'cajero', esAdmin: false, inventarioHabilitado: false, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InventarioPage />
      </MemoryRouter>
    )
    expect(html).toContain('Acceso restringido')
    expect(html).not.toContain('Nuevo producto')
    expect(html).not.toContain('Ajuste de stock')
  })
})
