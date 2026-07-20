import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sincronizarPendientes, type RpcParams } from './autoSync'
import {
  guardarEvento,
  listarPendientes,
  type EventoVentaOffline,
} from './colaOffline'

const DB_NAME = 'pv-caja'
const STORE = 'ventas_pendientes'
const DEVICE = 'disp-test-sync'

function evento(id: string): EventoVentaOffline {
  return {
    id_evento: id,
    empresa_id: 'emp-1',
    dispositivo: DEVICE,
    estado_sync: 'pendiente',
    payload: { total_usd: '1' },
    auditoria_stock: [],
    intentos: 0,
    creado_en: new Date().toISOString(),
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

describe('autoSync.ts', () => {
  beforeEach(async () => {
    await limpiar()
    localStorage.setItem('pv-device-id', DEVICE)
  })

  it('doble disparo sube cada evento 1 vez y queda sync_ok (REQ-4, sin duplicar)', async () => {
    await guardarEvento(evento('evt-sync-1'))
    const rpc = vi.fn(async (_p: RpcParams) => ({ insertado: true }))
    await Promise.all([sincronizarPendientes({ rpc }), sincronizarPendientes({ rpc })])
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(await listarPendientes(DEVICE)).toHaveLength(0) // sincronizado
  })

  it('reintenta entre ciclos: evento queda sync_ok tras fallo previo, sin duplicar', async () => {
    await guardarEvento(evento('evt-sync-2'))
    const rpc = vi.fn()
    rpc.mockRejectedValueOnce(new Error('network'))
    rpc.mockResolvedValueOnce({ insertado: true })
    await sincronizarPendientes({ rpc }) // falla -> pendiente, intentos 1
    await sincronizarPendientes({ rpc }) // ok -> sync_ok
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(await listarPendientes(DEVICE)).toHaveLength(0)
  })

  it('sube todos los pendientes una vez por evento', async () => {
    await guardarEvento(evento('evt-sync-3a'))
    await guardarEvento(evento('evt-sync-3b'))
    const rpc = vi.fn(async () => ({ insertado: true }))
    await sincronizarPendientes({ rpc })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(await listarPendientes(DEVICE)).toHaveLength(0)
  })
})
