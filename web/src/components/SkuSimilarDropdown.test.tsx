import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkuSimilarDropdown } from './SkuSimilarDropdown'

describe('SkuSimilarDropdown', () => {
  const mockProductos = [
    { id: '1', nombre: 'Martillo', sku: 'FER-001', similitud: 0.9 },
    { id: '2', nombre: 'Destornillador', sku: 'FER-002', similitud: 0.8 },
  ]

  it('muestra lista de productos similares', () => {
    render(
      <SkuSimilarDropdown
        productos={mockProductos}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('FER-001')).toBeInTheDocument()
    expect(screen.getByText('Destornillador')).toBeInTheDocument()
  })

  it('muestra porcentaje de similitud', () => {
    render(
      <SkuSimilarDropdown
        productos={mockProductos}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('llama onSelect con el producto al hacer click', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <SkuSimilarDropdown
        productos={mockProductos}
        onSelect={onSelect}
        onDismiss={vi.fn()}
      />
    )
    await user.click(screen.getByText('Martillo'))
    expect(onSelect).toHaveBeenCalledWith(mockProductos[0])
  })

  it('cierra el dropdown al presionar Escape', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(
      <SkuSimilarDropdown
        productos={mockProductos}
        onSelect={vi.fn()}
        onDismiss={onDismiss}
      />
    )
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalled()
  })

  it('no muestra nada si la lista está vacía', () => {
    const { container } = render(
      <SkuSimilarDropdown
        productos={[]}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra SKU y nombre de cada producto', () => {
    render(
      <SkuSimilarDropdown
        productos={mockProductos}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('FER-001')).toBeInTheDocument()
    expect(screen.getByText('FER-002')).toBeInTheDocument()
  })
})