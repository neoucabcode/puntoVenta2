import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSkuDisponibilidad } from './useSkuDisponibilidad'
import { verificarSkuDisponible } from '../lib/sku'

vi.mock('../lib/sku', () => ({
  verificarSkuDisponible: vi.fn(),
}))

describe('useSkuDisponibilidad', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(verificarSkuDisponible).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retorna estado inicial: disponible null, verificando false', () => {
    const { result } = renderHook(() => useSkuDisponibilidad('FER-001', 'emp1'))
    expect(result.current.disponible).toBeNull()
    expect(result.current.verificando).toBe(false)
  })

  it('no llama RPC si el SKU está vacío', () => {
    renderHook(() => useSkuDisponibilidad('', 'emp1'))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(verificarSkuDisponible).not.toHaveBeenCalled()
  })

  it('llama RPC después de 300ms de debounce', async () => {
    vi.mocked(verificarSkuDisponible).mockResolvedValue(true)
    const { result } = renderHook(() => useSkuDisponibilidad('FER-001', 'emp1'))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(verificarSkuDisponible).toHaveBeenCalledWith('emp1', 'FER-001')
    // Wait for the promise to resolve
    await act(async () => {
      await vi.runAllTimers()
    })
    expect(result.current.disponible).toBe(true)
    expect(result.current.verificando).toBe(false)
  })

  it('muestra verificando=true mientrasRPC está en vuelo', async () => {
    let resolveRpc: (value: boolean) => void
    vi.mocked(verificarSkuDisponible).mockImplementation(
      () => new Promise((resolve) => { resolveRpc = resolve })
    )
    const { result } = renderHook(() => useSkuDisponibilidad('FER-001', 'emp1'))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // RPC called, but not resolved yet
    expect(verificarSkuDisponible).toHaveBeenCalled()
    expect(result.current.verificando).toBe(true)

    await act(async () => {
      resolveRpc!(true)
      await vi.runAllTimers()
    })
    expect(result.current.verificando).toBe(false)
    expect(result.current.disponible).toBe(true)
  })

  it('resetea debounce al nuevo input', async () => {
    vi.mocked(verificarSkuDisponible).mockResolvedValue(true)
    const { result, rerender } = renderHook(
      ({ sku }) => useSkuDisponibilidad(sku, 'emp1'),
      { initialProps: { sku: 'FER-' } }
    )

    act(() => {
      vi.advanceTimersByTime(200) // Not enough
    })
    expect(verificarSkuDisponible).not.toHaveBeenCalled()

    rerender({ sku: 'FER-0012' })

    act(() => {
      vi.advanceTimersByTime(200) // Reset timer
    })
    expect(verificarSkuDisponible).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100) // Now 300ms from last change
    })
    expect(verificarSkuDisponible).toHaveBeenCalledWith('emp1', 'FER-0012')
  })

  it('maneja error del RPC sin bloquear', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(verificarSkuDisponible).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useSkuDisponibilidad('FER-001', 'emp1'))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    await act(async () => {
      await vi.runAllTimers()
    })

    expect(result.current.disponible).toBeNull()
    expect(result.current.verificando).toBe(false)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('cancelaRPC si el componente se desmonta', async () => {
    let resolveRpc: (value: boolean) => void
    vi.mocked(verificarSkuDisponible).mockImplementation(
      () => new Promise((resolve) => { resolveRpc = resolve })
    )
    const { unmount } = renderHook(() => useSkuDisponibilidad('FER-001', 'emp1'))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    unmount()

    await act(async () => {
      resolveRpc!(true)
      await vi.runAllTimers()
    })

    // No error should be thrown
  })

  it('no muestra indicador si el SKU es el mismo que ya se verificó', async () => {
    vi.mocked(verificarSkuDisponible).mockResolvedValue(true)
    const { result, rerender } = renderHook(
      ({ sku }) => useSkuDisponibilidad(sku, 'emp1'),
      { initialProps: { sku: 'FER-001' } }
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })

    await act(async () => {
      await vi.runAllTimers()
    })

    expect(result.current.disponible).toBe(true)

    // Rerender with same SKU
    rerender({ sku: 'FER-001' })

    act(() => {
      vi.advanceTimersByTime(400)
    })

    // Should not call RPC again
    expect(verificarSkuDisponible).toHaveBeenCalledTimes(1)
  })
})