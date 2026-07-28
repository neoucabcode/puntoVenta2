import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkuConfirmDialog } from './SkuConfirmDialog'

describe('SkuConfirmDialog', () => {
  const defaultProps = {
    currentSku: 'FER-0012',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('muestra titulo "Confirmar cambio de SKU" y boton Cancelar', () => {
    render(<SkuConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirmar cambio de SKU')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('muestra warning sobre imagenes en paso 1', () => {
    render(<SkuConfirmDialog {...defaultProps} />)
    expect(
      screen.getByText(/las imágenes NO se renombran/i)
    ).toBeInTheDocument()
  })

  it('paso 1: boton Confirmar esta deshabilitado hasta avanzar', () => {
    render(<SkuConfirmDialog {...defaultProps} />)
    const confirmBtn = screen.getByRole('button', { name: /entendido, continuar/i })
    expect(confirmBtn).toBeEnabled()
  })

  it('paso 2: pide escribir el SKU actual para confirmar', async () => {
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} />)

    // Avanzar al paso 2
    await user.click(screen.getByRole('button', { name: /entendido, continuar/i }))

    expect(screen.getByText(/escribe el sku actual para confirmar/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('FER-0012')).toBeInTheDocument()
  })

  it('paso 2: Confirmar se habilita solo cuando el SKU coincide', async () => {
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /entendido, continuar/i }))

    const input = screen.getByPlaceholderText('FER-0012')
    const confirmBtn = screen.getByRole('button', { name: /confirmar/i })

    // Deshabilitado al inicio
    expect(confirmBtn).toBeDisabled()

    // Incorrecto
    await user.type(input, 'OTRO')
    expect(confirmBtn).toBeDisabled()

    // Limpiar y escribir correcto
    await user.clear(input)
    await user.type(input, 'FER-0012')
    expect(confirmBtn).toBeEnabled()
  })

  it('llama onConfirm cuando se confirma correctamente', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /entendido, continuar/i }))
    await user.type(screen.getByPlaceholderText('FER-0012'), 'FER-0012')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('llama onCancel al cancelar', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('puede volver al paso 1 desde paso 2', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /entendido, continuar/i }))
    expect(screen.getByText(/escribe el sku actual para confirmar/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    // Cancelar en paso 2 cierra el dialog (llama onCancel)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('no usa window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<SkuConfirmDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /entendido, continuar/i }))
    await user.type(screen.getByPlaceholderText('FER-0012'), 'FER-0012')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
