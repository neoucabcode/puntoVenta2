import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CatalogoPage } from './CatalogoPage'
// ?raw expone el contenido del fuente como string (tipado por vite/client).
import catalogoSrc from './CatalogoPage.tsx?raw'

describe('CatalogoPage (solo lectura permanente)', () => {
  it('no renderiza botón "Vender" ni creación/edición', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>
    )
    expect(html).not.toContain('Vender')
    expect(html).not.toContain('Nuevo producto')
    expect(html).not.toContain('Editar')
  })

  it('el fuente ya no referencia ProductoForm / soloLectura / registrarVentaOffline', () => {
    expect(catalogoSrc).not.toContain('ProductoForm')
    expect(catalogoSrc).not.toContain('soloLectura')
    expect(catalogoSrc).not.toContain('registrarVentaOffline')
  })
})
