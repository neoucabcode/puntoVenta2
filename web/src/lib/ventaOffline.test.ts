import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registrarVentaOffline } from './ventaOffline'
import { obtenerEvento, listarPendientes, type EventoVentaOffline } from './colaOffline'
import type { ProductoJoin } from './productos'
import type { CarritoItem } from '../types/carrito'

// Ref del uuid de usuario, para simular login presente/ausente (W4).
const { usuarioIdRef } = vi.hoisted(() => ({ usuarioIdRef: { value: 'user-1' as string | null } }))

// Mock de empresa: dejamos el resto igual y sobreescribimos solo las dos
// funciones que necesita ventaOffline (y la que usa el store al importar).
vi.mock('./empresa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./empresa')>()
  return {
    ...actual,
    obtenerMiEmpresaId: vi.fn(async () => 'emp-1'),
    obtenerMiUsuarioId: vi.fn(async () => usuarioIdRef.value),
  }
})

const DB_NAME = 'pv-caja'
const STORE = 'ventas_pendientes'
const DEVICE = 'disp-test-w4'

function prod(overrides?: Partial<ProductoJoin>): ProductoJoin {
  return {
    id: 'prod-x',
    codigo_barras: null,
    sku: 'SKU-X',
    nombre: 'Producto Test',
    categoria_id: null,
    unidad: 'unidad',
    costo_usd: 1,
    precio_usd: 10,
    imagen_url: null,
    stock_actual: 5,
    stock_minimo: 1,
    activo: true,
    categoria: null,
    ...overrides,
  }
}

function carritoItem(p: ProductoJoin, cantidad = 2): CarritoItem {
  return {
    producto: p,
    cantidad,
    precio_override: null,
    descuento_item: 0,
  }
}

const pagos = [
  { metodo: 'efectivo', moneda: 'USD', monto: '20.00', monto_usd: '20.00', tasa_aplicada: '1' },
]

async function limpiar() {
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

describe('ventaOffline.ts — venta consolidada (1 evento por venta)', () => {
  beforeEach(async () => {
    await limpiar()
    localStorage.setItem('pv-device-id', DEVICE)
    usuarioIdRef.value = 'user-1'
  })

  it('usuario_id presente -> encola 1 evento pendiente con version 2 (REQ-3/REQ-4)', async () => {
    const id = await registrarVentaOffline(
      [carritoItem(prod())],
      pagos,
      'Cliente Test',
      'V-12345678',
      'contado',
      20,
      20,
      1
    )
    expect(id).toMatch(/^evt-/)
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    expect(ev.estado_sync).toBe('pendiente')
    const payload = ev.payload as { version: number; usuario_id: string; items: unknown[] }
    expect(payload.version).toBe(2)
    expect(payload.usuario_id).toBe('user-1')
    expect(payload.items).toHaveLength(1)
    expect(await listarPendientes(DEVICE)).toHaveLength(1)
  })

  it('carrito con multiples productos genera 1 solo evento', async () => {
    const p1 = prod()
    const p2 = prod({ id: 'prod-y', sku: 'SKU-Y', nombre: 'Producto 2' })
    const id = await registrarVentaOffline(
      [carritoItem(p1), carritoItem(p2)],
      pagos,
      '',
      '',
      'contado',
      40,
      40,
      1
    )
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    const payload = ev.payload as { items: Array<{ producto_id: string }> }
    expect(payload.items).toHaveLength(2)
    expect(payload.items[0].producto_id).toBe('prod-x')
    expect(payload.items[1].producto_id).toBe('prod-y')
    // Still only 1 event in the queue
    expect(await listarPendientes(DEVICE)).toHaveLength(1)
  })

  it('payload incluye datos del cliente y metodo de pago', async () => {
    const id = await registrarVentaOffline(
      [carritoItem(prod())],
      pagos,
      'Maria Perez',
      'V-99999999',
      'credito',
      20,
      20,
      1
    )
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    const payload = ev.payload as {
      cliente: string
      cedula: string
      metodo_pago: string
      total_usd: number
      total_bs: number
      tasa_aplicada: number
    }
    expect(payload.cliente).toBe('Maria Perez')
    expect(payload.cedula).toBe('V-99999999')
    expect(payload.metodo_pago).toBe('credito')
    expect(payload.total_usd).toBe(20)
    expect(payload.total_bs).toBe(20)
    expect(payload.tasa_aplicada).toBe(1)
  })

  it('carrito vacio lanza error', async () => {
    await expect(
      registrarVentaOffline([], pagos, '', '', 'contado', 0, 0, 1)
    ).rejects.toThrow('Carrito vacío')
  })

  it('usuario_id ausente -> evento queda sync_error y NO lanza (W4)', async () => {
    usuarioIdRef.value = null
    const id = await registrarVentaOffline(
      [carritoItem(prod())],
      pagos,
      '',
      '',
      'contado',
      20,
      20,
      1
    )
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    expect(ev.estado_sync).toBe('sync_error')
    expect(ev.mensaje_error).toMatch(/usuario/i)
    const payload = ev.payload as { usuario_id: string }
    expect(payload.usuario_id).toBe('')
    // No se encola como pendiente infinito que reintenta y explota.
    expect(await listarPendientes(DEVICE)).toHaveLength(0)
  })
})
