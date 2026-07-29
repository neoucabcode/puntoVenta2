import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ConfiguracionPage } from './ConfiguracionPage'

const h = vi.hoisted(() => ({
  rol: { rol: 'admin' as string | null, esAdmin: true, inventarioHabilitado: true, loading: false },
  empresaConfig: {
    config: {
      id: 'cfg-1',
      empresa_id: 'emp-001',
      autogenerar_activo: true,
      plantilla: 'categoria_secuencial' as const,
      usa_categoria: true,
      modo_contador: 'por_categoria' as const,
      longitud_secuencial: 4,
      prefijo_manual: null,
      umbral_similitud: 0.3,
      creado_en: '2024-01-01',
      actualizado_en: '2024-01-01',
    },
    loading: false,
  },
  empresa: {
    empresa: {
      id: 'emp-001',
      nombre: 'Ferretería Demo',
      tasa_activa: 36.5,
      igtf_habilitado: false,
      caja_obligatoria: true,
      venta_sin_stock: false,
      stock_negativo: false,
    },
    loading: false,
  },
  modulos: {
    modulos: [
      { modulo: 'catalogo', habilitado: true },
      { modulo: 'venta', habilitado: true },
      { modulo: 'inventario', habilitado: true },
      { modulo: 'caja', habilitado: true },
      { modulo: 'reportes', habilitado: false },
    ],
    loading: false,
    estaHabilitado: (nombre: string) => nombre !== 'reportes',
    refrescar: vi.fn(),
  },
}))

vi.mock('../hooks/useUsuarioRol', () => ({
  useUsuarioRol: () => h.rol,
}))

vi.mock('../hooks/useEmpresaConfig', () => ({
  useEmpresaConfig: () => h.empresaConfig,
}))

vi.mock('../lib/empresa', async () => {
  const actual = await vi.importActual<typeof import('../lib/empresa')>('../lib/empresa')
  return {
    ...actual,
    obtenerMiEmpresa: vi.fn(() => Promise.resolve(h.empresa.empresa)),
  }
})

vi.mock('../hooks/useModulos', () => ({
  useModulos: () => h.modulos,
}))

describe('ConfiguracionPage', () => {
  it('admin ve la página de configuración', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    expect(html).toContain('Configuración')
  })

  it('no-admin no ve la página (redirige)', () => {
    h.rol = { rol: 'cajero', esAdmin: false, inventarioHabilitado: false, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    expect(html).not.toContain('Configuración')
    expect(html).not.toContain('config-page')
  })

  it('muestra las 3 pestañas: SKU, Empresa, Módulos', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    expect(html).toContain('SKU')
    expect(html).toContain('Empresa')
    expect(html).toContain('Módulos')
  })

  it('muestra formulario de SKU por defecto (tab activo)', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    // SKU tab es el activo por defecto
    expect(html).toContain('Autogenerar SKU')
    expect(html).toContain('Plantilla')
    expect(html).toContain('Guardar')
  })

  it('no muestra campos de empresa en tab SKU (renderizado condicional)', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    // Los campos de empresa NO están en el HTML porque el tab no está activo
    expect(html).not.toContain('Tasa activa')
  })

  it('no muestra módulos en tab SKU (renderizado condicional)', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: false }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    // Los módulos NO están en el HTML porque el tab no está activo
    expect(html).not.toContain('Catálogo')
  })

  it('loading muestra estado de carga', () => {
    h.rol = { rol: 'admin', esAdmin: true, inventarioHabilitado: true, loading: true }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>
    )
    expect(html).toContain('Cargando')
  })
})
