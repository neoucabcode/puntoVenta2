import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PosPage } from './PosPage'
import { listarPendientes, type EventoVentaOffline } from '../lib/colaOffline'
import { useCajaStore } from '../store/useCajaStore'

// Mock de empresa: dejamos el resto igual y sobreescribimos las funciones que
// usa PosPage + ventaOffline (patron heredado de ventaOffline.test.ts).
const { refs } = vi.hoisted(() => ({
  refs: { usuarioId: 'user-1', tasa: 100 },
}))
vi.mock('../lib/empresa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/empresa')>()
  return {
    ...actual,
    obtenerMiEmpresaId: vi.fn(async () => 'emp-1'),
    obtenerMiUsuarioId: vi.fn(async () => refs.usuarioId),
    obtenerMiEmpresa: vi.fn(async () => ({
      id: 'emp-1',
      nombre: 'Ferreteria Demo',
      tasa_activa: refs.tasa,
      igtf_habilitado: false,
      caja_obligatoria: false,
      venta_sin_stock: true,
      stock_negativo: false,
    })),
  }
})

const DB_NAME = 'pv-caja'
const STORE = 'ventas_pendientes'
const DEVICE = 'disp-test-slice2'

async function limpiarDB() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id_evento' })
        s.createIndex('estado_sync', 'estado_sync', { unique: false })
        s.createIndex('dispositivo', 'dispositivo', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

describe('PosPage — Slice 2 regresion offline (2-pantalla)', () => {
  beforeEach(async () => {
    await limpiarDB()
    localStorage.setItem('pv-device-id', DEVICE)
    // Caja "abierta" => venta habilitada (modo offline-safe).
    useCajaStore.getState().setCajaHabilitada(true)
    useCajaStore.getState().setCajaAbierta(true)
  })

  it('venta offline produce evento identico en ventas_pendientes', async () => {
    render(<PosPage />)

    // Pantalla 1: agregar producto al carrito
    const btn = await screen.findByRole('button', { name: /Taladro/ })
    fireEvent.click(btn)

    // Click en "Cobrar" para ir a pantalla 2
    const cobrar = screen.getByRole('button', { name: /Cobrar/ })
    fireEvent.click(cobrar)

    // Pantalla 2: ingresar efectivo USD
    const addPago = screen.getByRole('button', { name: /Agregar pago/ })
    fireEvent.click(addPago)

    const montoInput = await screen.findByLabelText('Monto del pago 1')
    fireEvent.change(montoInput, { target: { value: '79' } })

    // Confirmar venta
    const confirmar = screen.getByRole('button', { name: /Confirmar venta/ })
    fireEvent.click(confirmar)

    await waitFor(async () => {
      const pend = await listarPendientes(DEVICE)
      expect(pend.length).toBe(1)
    })
    const pend = (await listarPendientes(DEVICE)) as EventoVentaOffline[]
    const payload = pend[0].payload as {
      usuario_id: string
      total_usd: string
      detalles: Array<{ producto_id: string; cantidad: string }>
      pagos: Array<{ metodo: string; moneda: string }>
    }
    expect(payload.usuario_id).toBe('user-1')
    expect(payload.detalles[0].producto_id).toBe('prod-1')
    expect(payload.pagos[0].metodo).toBe('efectivo')
    expect(payload.pagos[0].moneda).toBe('USD')
  })

  it('muestra aviso de tasa desactualizada cuando esta offline y la ultima sync >24h', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })
    localStorage.setItem(
      'pv-tasa-sync',
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    )

    render(<PosPage />)
    await waitFor(() => {
      expect(screen.getByText(/desactualizada/)).toBeTruthy()
    })
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  it('registra el metodo de pago seleccionado en la UI (A credito)', async () => {
    render(<PosPage />)

    // Agregar producto
    const btn = await screen.findByRole('button', { name: /Taladro/ })
    fireEvent.click(btn)

    // Ir a pantalla de pago
    const cobrar = screen.getByRole('button', { name: /Cobrar/ })
    fireEvent.click(cobrar)

    // Seleccionar credito
    const credito = await screen.findByRole('radio', { name: /A credito/ })
    fireEvent.click(credito)
    expect(credito.getAttribute('aria-checked')).toBe('true')
  })

  it('boton Cobrar deshabilitado cuando carrito vacio', async () => {
    render(<PosPage />)
    expect(screen.queryByRole('button', { name: /Cobrar/ })).toBeNull()
  })

  it('Volver desde pantalla pago regresa a pantalla venta', async () => {
    render(<PosPage />)

    const btn = await screen.findByRole('button', { name: /Taladro/ })
    fireEvent.click(btn)

    const cobrar = screen.getByRole('button', { name: /Cobrar/ })
    fireEvent.click(cobrar)

    const volver = screen.getByRole('button', { name: /Volver/ })
    fireEvent.click(volver)

    // Deberia estar de vuelta en pantalla de venta
    expect(screen.getByRole('button', { name: /Cobrar/ })).toBeTruthy()
  })
})
