import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from './Layout'

const h = vi.hoisted(() => ({
  rol: { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false },
}))

vi.mock('../hooks/useUsuarioRol', () => ({
  useUsuarioRol: () => h.rol,
}))

describe('Layout nav (3 secciones)', () => {
  it('admin ve Venta, Catálogo e Inventario', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Layout>
          <div>x</div>
        </Layout>
      </MemoryRouter>
    )
    expect(html).toContain('Venta')
    expect(html).toContain('Catálogo')
    expect(html).toContain('Inventario')
  })

  it('vendedor (no-admin) no ve el item Inventario (bloqueado)', () => {
    h.rol = { rol: 'cajero', esAdmin: false, inventarioHabilitado: false, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Layout>
          <div>x</div>
        </Layout>
      </MemoryRouter>
    )
    expect(html).toContain('Venta')
    expect(html).toContain('Catálogo')
    expect(html).not.toContain('Inventario')
  })
})
