import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registrarVentaOffline } from './ventaOffline'
import { obtenerEvento, listarPendientes, type EventoVentaOffline } from './colaOffline'
import type { ProductoJoin } from './productos'

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

function prod(): ProductoJoin {
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
  }
}

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

describe('ventaOffline.ts — W4 usuario_id', () => {
  beforeEach(async () => {
    await limpiar()
    localStorage.setItem('pv-device-id', DEVICE)
    usuarioIdRef.value = 'user-1'
  })

  it('usuario_id presente -> encola evento pendiente (REQ-3/REQ-4)', async () => {
    const id = await registrarVentaOffline(prod())
    expect(id).toMatch(/^evt-/)
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    expect(ev.estado_sync).toBe('pendiente')
    expect((ev.payload as { usuario_id: string }).usuario_id).toBe('user-1')
    // no queda como sync_error ni desaparece: sigue pendiente
    expect(await listarPendientes(DEVICE)).toHaveLength(1)
  })

  it('usuario_id ausente -> evento queda sync_error y NO lanza (W4)', async () => {
    usuarioIdRef.value = null
    // No debe lanzar aunque no haya uuid para firmar la venta.
    const id = await registrarVentaOffline(prod())
    const ev = (await obtenerEvento(id)) as EventoVentaOffline
    expect(ev.estado_sync).toBe('sync_error')
    expect(ev.mensaje_error).toMatch(/usuario/i)
    expect((ev.payload as { usuario_id: string }).usuario_id).toBe('')
    // No se encola como pendiente infinito que reintenta y explota.
    expect(await listarPendientes(DEVICE)).toHaveLength(0)
  })
})
