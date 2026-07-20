// cacheCatalogo.ts — caché local de solo lectura del catálogo (W1, REQ-2).
//
// El catálogo es solo-lectura en modo offline (REQ-2): esta caché NO se usa
// para crear/editar, solo para servir el listado cuando no hay conexión o la
// query a Supabase falla. Respeta el gating de solo-lectura del catálogo.
//
// `obtenerCatalogo` es la única función que deben usar las páginas: intenta la
// fuente fresca (fetcher inyectado, p.ej. listarProductos) y, en fallo o offline,
// devuelve la caché marcando `desdeCache: true`. La caché vive en IndexedDB
// (polyfill fake-indexeddb en tests).

import type { ListarResult, ProductoJoin } from './productos'

const DB_NAME = 'pv-cache-catalogo'
const STORE = 'productos'
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
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Guarda la copia local del catálogo (solo lectura). Reemplaza lo previo.
export async function guardarCacheCatalogo(items: ProductoJoin[]): Promise<void> {
  const db = await abrirDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const os = tx.objectStore(STORE)
    const clearReq = os.clear()
    clearReq.onerror = () => reject(clearReq.error)
    clearReq.onsuccess = () => {
      for (const item of items) os.put(item)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Lee la caché local. Devuelve null si no hay nada guardado.
export async function leerCacheCatalogo(): Promise<ProductoJoin[] | null> {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = (req.result as ProductoJoin[]) ?? []
      resolve(rows.length ? rows : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export type ResultadoCatalogo = {
  items: ProductoJoin[]
  desdeCache: boolean
  hasMore: boolean
}

// Obtiene el catálogo priorizando la fuente fresca; si está offline o falla,
// devuelve la caché local (desdeCache=true). En offline sin caché, lanza para
// que la UI informe que no hay catálogo disponible.
export async function obtenerCatalogo(
  fetcher: () => Promise<ListarResult>,
  opts?: { forzarCache?: boolean; guardarEnCache?: boolean }
): Promise<ResultadoCatalogo> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || opts?.forzarCache) {
    const cache = await leerCacheCatalogo()
    if (cache && cache.length) {
      return { items: cache, desdeCache: true, hasMore: false }
    }
    throw new Error('Sin conexión y sin caché de catálogo disponible')
  }
  try {
    const res = await fetcher()
    if (opts?.guardarEnCache !== false) {
      await guardarCacheCatalogo(res.items)
    }
    return { items: res.items, desdeCache: false, hasMore: res.hasMore }
  } catch (err) {
    const cache = await leerCacheCatalogo()
    if (cache && cache.length) {
      return { items: cache, desdeCache: true, hasMore: false }
    }
    throw err
  }
}
