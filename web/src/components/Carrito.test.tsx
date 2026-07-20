import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Carrito, type CarritoItem, type MetodoPago } from './Carrito'
import type { ProductoJoin } from '../lib/productos'

function prod(over: Partial<ProductoJoin> = {}): ProductoJoin {
  return {
    id: 'p1',
    codigo_barras: null,
    sku: 'SKU-1',
    nombre: 'Taladro 12V',
    categoria_id: null,
    unidad: 'unidad',
    costo_usd: 1,
    precio_usd: 10,
    imagen_url: null,
    stock_actual: 5,
    stock_minimo: 1,
    activo: true,
    categoria: null,
    ...over,
  }
}

function base(over: Partial<Parameters<typeof Carrito>[0]> = {}) {
  return {
    items: [] as CarritoItem[],
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onRemove: vi.fn(),
    tasa: 100,
    tasaActualizadaEn: new Date().toISOString(),
    metodoPago: 'contado' as MetodoPago,
    onMetodoPago: vi.fn(),
    cliente: '',
    onCliente: vi.fn(),
    clientesRecientes: [] as string[],
    onConfirmar: vi.fn(),
    onAtras: vi.fn(),
    deshabilitado: false,
    procesando: false,
    ...over,
  }
}

describe('Carrito.tsx — fidelidad Fina (Slice 2)', () => {
  it('muestra la tasa Bs/$ visible', () => {
    render(<Carrito {...base({ tasa: 100 })} />)
    expect(screen.getByText('1 USD = 100 Bs')).toBeTruthy()
    expect(screen.getByText('Tasa de cambio')).toBeTruthy()
  })

  it('NO muestra aviso de tasa desactualizada cuando es reciente', () => {
    render(<Carrito {...base()} />)
    expect(screen.queryByText(/Puede estar desactualizada/)).toBeNull()
  })

  it('muestra aviso de tasa desactualizada cuando pasó >24h', () => {
    const vieja = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    render(<Carrito {...base({ tasaActualizadaEn: vieja })} />)
    expect(screen.getByText(/Puede estar desactualizada/)).toBeTruthy()
  })

  it('muestra métodos de pago explícitos (De contado / A crédito)', () => {
    render(<Carrito {...base()} />)
    const contado = screen.getByRole('radio', { name: /De contado/ })
    const credito = screen.getByRole('radio', { name: /A crédito/ })
    expect(contado).toBeTruthy()
    expect(credito).toBeTruthy()
    expect(contado.getAttribute('aria-checked')).toBe('true')
    expect(credito.getAttribute('aria-checked')).toBe('false')
  })

  it('estado vacío claro cuando no hay ítems', () => {
    render(<Carrito {...base()} />)
    expect(screen.getByText(/Tu carrito está vacío/)).toBeTruthy()
    const confirmar = screen.getByRole('button', { name: 'Confirmar' })
    expect(confirmar.hasAttribute('disabled')).toBe(true)
  })

  it('renderiza ítems con SKU, nombre, subtotal y total + equivalente Bs', () => {
    const items: CarritoItem[] = [
      { producto: prod({ sku: 'SKU-1', nombre: 'Taladro 12V', precio_usd: 10 }), cantidad: 3 },
      { producto: prod({ id: 'p2', sku: 'SKU-2', nombre: 'Cable', precio_usd: 5 }), cantidad: 2 },
    ]
    render(<Carrito {...base({ items })} />)
    expect(screen.getByText('SKU-1')).toBeTruthy()
    expect(screen.getByText('Taladro 12V')).toBeTruthy()
    expect(screen.getByText('$30.00')).toBeTruthy() // 10*3
    expect(screen.getByText('$10.00')).toBeTruthy() // 5*2
    expect(screen.getByText('$40.00')).toBeTruthy() // total USD
    expect(screen.getByText('Bs 4000.00')).toBeTruthy() // total Bs
  })

  it('muestra badge "Agotado" cuando el stock es 0', () => {
    const items: CarritoItem[] = [
      { producto: prod({ nombre: 'Martillo', stock_actual: 0 }), cantidad: 1 },
    ]
    render(<Carrito {...base({ items })} />)
    expect(screen.getByText('Agotado')).toBeTruthy()
  })

  it('incrementa/decrementa/quita vía callbacks', () => {
    const onIncrement = vi.fn()
    const onDecrement = vi.fn()
    const onRemove = vi.fn()
    const items: CarritoItem[] = [{ producto: prod(), cantidad: 2 }]
    render(<Carrito {...base({ items, onIncrement, onDecrement, onRemove })} />)
    fireEvent.click(screen.getByRole('button', { name: /Agregar uno de Taladro/ }))
    expect(onIncrement).toHaveBeenCalledWith('p1')
    fireEvent.click(screen.getByRole('button', { name: /Quitar uno de Taladro/ }))
    expect(onDecrement).toHaveBeenCalledWith('p1')
    fireEvent.click(screen.getByRole('button', { name: /Quitar Taladro 12V del carrito/ }))
    expect(onRemove).toHaveBeenCalledWith('p1')
  })

  it('selecciona método A crédito y emite callback', () => {
    const onMetodoPago = vi.fn()
    render(<Carrito {...base({ onMetodoPago })} />)
    fireEvent.click(screen.getByRole('radio', { name: /A crédito/ }))
    expect(onMetodoPago).toHaveBeenCalledWith('credito')
  })
})
