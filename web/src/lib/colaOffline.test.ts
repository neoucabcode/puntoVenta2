import { describe, it, expect, beforeEach } from 'vitest'
import {
  guardarEvento,
  listarPendientes,
  marcarSyncOk,
  eliminarEvento,
  incrementarIntento,
  type EventoVentaOffline,
} from './colaOffline'

const DB_NAME = 'pv-caja'
const STORE = 'ventas_pendientes'

function evento(id: string, dispositivo = 'disp-test'): EventoVentaOffline {
  return {
    id_evento: id,
    empresa_id: 'emp-1',
    dispositivo,
    estado_sync: 'pendiente',
    payload: { foo: 'bar' },
    auditoria_stock: [],
    intentos: 0,
    creado_en: new Date().toISOString(),
  }
}

// Limpia el store entre tests sin depender de cierre de conexiones previas.
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

describe('colaOffline', () => {
  beforeEach(async () => {
    await limpiar()
  })

  it('guardarEvento es idempotente: mismo id_evento deja 1 registro (REQ-3)', async () => {
    await guardarEvento(evento('evt-1'))
    await guardarEvento(evento('evt-1'))
    const pend = await listarPendientes('disp-test')
    expect(pend).toHaveLength(1)
    expect(pend[0].id_evento).toBe('evt-1')
  })

  it('persiste con estado pendiente y lo lista (REQ-3)', async () => {
    await guardarEvento(evento('evt-2'))
    const pend = await listarPendientes('disp-test')
    expect(pend).toHaveLength(1)
    expect(pend[0].estado_sync).toBe('pendiente')
  })

  it('marcarSyncOk saca el evento de pendientes', async () => {
    await guardarEvento(evento('evt-3'))
    await marcarSyncOk('evt-3')
    const pend = await listarPendientes('disp-test')
    expect(pend).toHaveLength(0)
  })

  it('eliminarEvento limpia el registro', async () => {
    await guardarEvento(evento('evt-4'))
    await eliminarEvento('evt-4')
    const pend = await listarPendientes('disp-test')
    expect(pend).toHaveLength(0)
  })

  it('filtra por dispositivo', async () => {
    await guardarEvento(evento('evt-5', 'disp-A'))
    await guardarEvento(evento('evt-6', 'disp-B'))
    const pendA = await listarPendientes('disp-A')
    expect(pendA).toHaveLength(1)
    expect(pendA[0].id_evento).toBe('evt-5')
  })

  it('incrementarIntento suma al contador', async () => {
    await guardarEvento(evento('evt-7'))
    await incrementarIntento('evt-7')
    const pend = await listarPendientes('disp-test')
    expect(pend[0].intentos).toBe(1)
  })
})
