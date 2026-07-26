import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SortDropdown } from './SortDropdown'

describe('SortDropdown', () => {
  it('renders with default options and shows selected label', () => {
    render(<SortDropdown value="nombre ASC" onChange={vi.fn()} />)
    expect(screen.getByText('Nombre A-Z')).toBeTruthy()
  })

  it('opens dropdown on click and shows all options', () => {
    render(<SortDropdown value="nombre ASC" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /nombre a-z/i }))

    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Nombre A-Z' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Nombre Z-A' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Precio ↑' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Precio ↓' })).toBeTruthy()
  })

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn()
    render(<SortDropdown value="nombre ASC" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /nombre a-z/i }))
    fireEvent.click(screen.getByRole('option', { name: 'Precio ↓' }))

    expect(onChange).toHaveBeenCalledWith('precio DESC')
  })

  it('marks the current selection with aria-selected', () => {
    render(<SortDropdown value="precio ASC" onChange={vi.fn()} />)
    // Button shows current selection label
    fireEvent.click(screen.getByRole('button', { name: /precio ↑/i }))

    const precioUp = screen.getByRole('option', { name: 'Precio ↑' })
    const nombreAz = screen.getByRole('option', { name: 'Nombre A-Z' })
    expect(precioUp.getAttribute('aria-selected')).toBe('true')
    expect(nombreAz.getAttribute('aria-selected')).toBe('false')
  })

  it('closes on Escape key', () => {
    render(<SortDropdown value="nombre ASC" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /nombre a-z/i }))
    expect(screen.getByRole('listbox')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('supports custom options prop', () => {
    const custom = [
      { label: 'Recientes', value: 'recientes' },
      { label: 'Populares', value: 'populares' },
    ]
    render(<SortDropdown value="recientes" onChange={vi.fn()} options={custom} />)
    fireEvent.click(screen.getByRole('button', { name: /recientes/i }))

    expect(screen.getByRole('option', { name: 'Recientes' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Populares' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Nombre A-Z' })).toBeNull()
  })
})
