import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkuAvailabilityIndicator } from './SkuAvailabilityIndicator'

describe('SkuAvailabilityIndicator', () => {
  it('muestra spinner cuando verificando es true', () => {
    render(<SkuAvailabilityIndicator verificando={true} disponible={null} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/verificando/i)).toBeInTheDocument()
  })

  it('muestra check verde cuando disponible es true', () => {
    render(<SkuAvailabilityIndicator verificando={false} disponible={true} />)
    expect(screen.getByText('✅')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('muestra X roja cuando disponible es false', () => {
    render(<SkuAvailabilityIndicator verificando={false} disponible={false} />)
    expect(screen.getByText('❌')).toBeInTheDocument()
    expect(screen.getByText('Ya existe')).toBeInTheDocument()
  })

  it('no muestra nada cuando verificando es false y disponible es null', () => {
    const { container } = render(
      <SkuAvailabilityIndicator verificando={false} disponible={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('tiene aria-label descriptivo', () => {
    render(<SkuAvailabilityIndicator verificando={false} disponible={true} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'SKU disponible')
  })

  it('tiene aria-label para SKU no disponible', () => {
    render(<SkuAvailabilityIndicator verificando={false} disponible={false} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'SKU no disponible')
  })
})