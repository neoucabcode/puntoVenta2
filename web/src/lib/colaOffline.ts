// colaOffline.ts — wrapper tipado de IndexedDB para la cola de ventas offline.
//
// Responsabilidad: persistir cada venta offline como un evento inmutable ANTES
// de cualquier intento de red (offline-first, REQ-3). El id_evento es la clave
// de idempotencia: el upsert en Supabase por PK nunca crea dos ventas del mismo
// evento (REQ-3/REQ-4). El stock se registra como auditoría y nunca bloquea.
//
// El client de Supabase puede ser `null` (sin env): este módulo es offline-safe
// y no depende de la red. numeric de Postgres se tipa como string en el payload.

export type EstadoSync = 'pendiente' | 'sync_ok' | 'sync_error'

export interface EventoVentaOffline {
  id_evento: string
  empresa_id: string
  dispositivo: string
  sesion_caja_id?: string
  estado_sync: EstadoSync
  // jsonb: venta + detalles + pagos (contrato estable). Se guarda tal cual.
  payload: unknown
  // jsonb: salidas de stock con causa venta_offline (auditoría RN-11).
  auditoria_stock: unknown
  intentos: number
  creado_en: string
}

const DB_NAME = 'pv-caja'
const STORE = 'ventas_pendientes'
const VERSION = 1

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este entorno'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id_evento' })
        store.createIndex('estado_sync', 'estado_sync', { unique: false })
        store.createIndex('dispositivo', 'dispositivo', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function store(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

// Guarda (put) un evento. Put es idempotente por keyPath: reescribir el mismo
// id_evento reemplaza, no duplica (REQ-3, idempotencia local).
export async function guardarEvento(e: EventoVentaOffline): Promise<void> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readwrite').put(e)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Lista eventos pendientes de un dispositivo (estado_sync='pendiente').
export async function listarPendientes(dispositivo: string): Promise<EventoVentaOffline[]> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const idx = store(db, 'readonly').index('estado_sync')
    const range = IDBKeyRange.only('pendiente')
    const out: EventoVentaOffline[] = []
    const cursorReq = idx.openCursor(range)
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        const val = cursor.value as EventoVentaOffline
        if (val.dispositivo === dispositivo) out.push(val)
        cursor.continue()
      } else {
        resolve(out)
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
}

// Marca un evento como sincronizado OK (lo saca de la lista de pendientes).
export async function marcarSyncOk(id: string): Promise<void> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const os = store(db, 'readwrite')
    const getReq = os.get(id)
    getReq.onsuccess = () => {
      const val = getReq.result as EventoVentaOffline | undefined
      if (!val) {
        resolve()
        return
      }
      val.estado_sync = 'sync_ok'
      const putReq = os.put(val)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// Incrementa el contador de intentos tras un fallo de sync (para backoff, REQ-4).
export async function incrementarIntento(id: string): Promise<void> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const os = store(db, 'readwrite')
    const getReq = os.get(id)
    getReq.onsuccess = () => {
      const val = getReq.result as EventoVentaOffline | undefined
      if (!val) {
        resolve()
        return
      }
      val.intentos = (val.intentos ?? 0) + 1
      const putReq = os.put(val)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// Elimina un evento de la cola (ya no se necesita, o rechazo definitivo).
export async function eliminarEvento(id: string): Promise<void> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const req = store(db, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
