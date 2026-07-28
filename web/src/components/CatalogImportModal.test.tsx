import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CatalogImportModal } from './CatalogImportModal'

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const mockImportarCatalogo = vi.fn()

vi.mock('../lib/catalogo', () => ({
  importarCatalogo: (...args: unknown[]) => mockImportarCatalogo(...args),
}))

vi.mock('../lib/empresa', () => ({
  obtenerMiEmpresaId: async () => 'emp-test',
}))

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uploadFile(input: HTMLInputElement, file: File) {
  // happy-dom doesn't support DataTransfer fully, so we set files via Object.defineProperty
  const dt = new DataTransfer()
  dt.items.add(file)
  Object.defineProperty(input, 'files', { value: dt.files, writable: false })
  fireEvent.change(input)
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('CatalogImportModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onImported: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockImportarCatalogo.mockResolvedValue({ imported: 5, categories: 2, errors: [] })
  })

  it('muestra titulo "Importar catálogo" y boton cancelar', () => {
    render(<CatalogImportModal {...defaultProps} />)
    expect(screen.getByText('Importar catálogo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('muestra area de drag & drop con texto de instruccion', () => {
    render(<CatalogImportModal {...defaultProps} />)
    expect(screen.getByText(/arrastra.*zip/i)).toBeInTheDocument()
  })

  it('acepta archivo ZIP via input', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip-content'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(mockImportarCatalogo).toHaveBeenCalledOnce()
    })
  })

  it('rechaza archivos que no son ZIP', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['content'], 'image.png', { type: 'image/png' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(screen.getByText(/formato/i)).toBeInTheDocument()
    })
  })

  it('llama importarCatalogo al procesar archivo valido', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(mockImportarCatalogo).toHaveBeenCalledOnce()
      expect(mockImportarCatalogo).toHaveBeenCalledWith(
        file,
        'emp-test',
        expect.any(Function)
      )
    })
  })

  it('muestra progreso durante la importacion', async () => {
    mockImportarCatalogo.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ imported: 3, categories: 1, errors: [] }), 200))
    )

    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(screen.getByText(/importando/i)).toBeInTheDocument()
    })
  })

  it('muestra resumen de exito al completar', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(screen.getByText(/importados/i)).toBeInTheDocument()
      expect(screen.getByText(/5 productos/)).toBeInTheDocument()
    })
  })

  it('muestra errores cuando la importacion falla', async () => {
    mockImportarCatalogo.mockRejectedValue(new Error('ZIP no válido'))

    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['bad-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(screen.getByText(/no válido/i)).toBeInTheDocument()
    })
  })

  it('llama onClose al cerrar', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })

  it('llama onImported despues de importacion exitosa', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(defaultProps.onImported).toHaveBeenCalledOnce()
    })
  })

  it('permite importar otro archivo despues de exito', async () => {
    render(<CatalogImportModal {...defaultProps} />)

    const file = new File(['fake-zip'], 'catalogo.zip', { type: 'application/zip' })
    const input = screen.getByLabelText(/seleccionar archivo/i) as HTMLInputElement

    uploadFile(input, file)

    await waitFor(() => {
      expect(screen.getByText(/importados/i)).toBeInTheDocument()
    })

    // Should have a "Importar otro" button
    expect(screen.getByRole('button', { name: /otro/i })).toBeInTheDocument()
  })
})
