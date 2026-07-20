import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PosPage } from './PosPage'
import { listarPendientes, type EventoVentaOffline } from '../lib/colaOffline'
import { useCajaStore } from '../store/useCajaStore'

// Mock de empresa: dejamos el resto igual y sobreescribimos las funciones que
// usa PosPage + ventaOffline (patrón heredado de ventaOffline.test.ts).
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
      nombre: 'Ferretería Demo',
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

describe('PosPage — Slice 2 regresión offline (modo-caja-offline)', () => {
  beforeEach(async () => {
    await limpiarDB()
    localStorage.setItem('pv-device-id', DEVICE)
    // Caja "abierta" => venta habilitada (modo offline-safe).
    useCajaStore.getState().setCajaHabilitada(true)
    useCajaStore.getState().setCajaAbierta(true)
  })

  it('venta offline produce evento idéntico en ventas_pendientes (sin regresión de cola)', async () => {
    render(<PosPage />)
    // Esperar a que carguen las sugerencias del catálogo mock.
    const btn = await screen.findByRole('button', { name: /Taladro/ })
    fireEvent.click(btn)

    const confirmar = screen.getByRole('button', { name: 'Confirmar' })
    fireEvent.click(confirmar)

    await waitFor(async () => {
      const pend = await listarPendientes(DEVICE)
      expect(pend.length).toBe(1)
    })
    const pend = (await listarPendientes(DEVICE)) as EventoVentaOffline[]
    // Mismo contrato que antes del refresh: payload con usuario, total y pago.
    const payload = pend[0].payload as {
      usuario_id: string
      total_usd: string
      detalles: Array<{ producto_id: string; cantidad: string }>
      pagos: Array<{ metodo: string; moneda: string }>
    }
    expect(payload.usuario_id).toBe('user-1')
    expect(payload.detalles[0].producto_id).toBe('prod-1')
    expect(payload.pagos[0].metodo).toBe('efectivo')
  })

  it('muestra aviso de tasa desactualizada cuando está offline y la última sync >24h', async () => {
    // Forzar offline y sembrar una sincronización vieja.
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
      expect(screen.getByText(/Puede estar desactualizada/)).toBeTruthy()
    })
    // Restaurar online para no afectar otros tests.
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  it('registra el método de pago seleccionado en la UI (A crédito)', async () => {
    render(<PosPage />)
    const credito = await screen.findByRole('radio', { name: /A crédito/ })
    fireEvent.click(credito)
    expect(credito.getAttribute('aria-checked')).toBe('true')
  })
})
