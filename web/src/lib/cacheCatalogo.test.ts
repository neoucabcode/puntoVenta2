import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  guardarCacheCatalogo,
  leerCacheCatalogo,
  obtenerCatalogo,
} from './cacheCatalogo'
import type { ProductoJoin } from './productos'

const DB_NAME = 'pv-cache-catalogo'
const STORE = 'productos'

function prod(id: string): ProductoJoin {
  return {
    id,
    codigo_barras: null,
    sku: `SKU-${id}`,
    nombre: `Producto ${id}`,
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
        d.createObjectStore(STORE, { keyPath: 'id' })
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

describe('cacheCatalogo.ts — W1 caché offline del catálogo', () => {
  const onLineOriginal = typeof navigator !== 'undefined' ? navigator.onLine : true

  beforeEach(async () => {
    await limpiar()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: onLineOriginal,
      configurable: true,
    })
  })

  it('tras carga hay caché (obtenerCatalogo guarda al fetchear online)', async () => {
    const fetcher = vi.fn(async () => ({ items: [prod('a')], hasMore: false }))
    const res = await obtenerCatalogo(fetcher)
    expect(res.desdeCache).toBe(false)
    expect(res.items).toHaveLength(1)
    const cache = await leerCacheCatalogo()
    expect(cache).not.toBeNull()
    expect(cache![0].id).toBe('a')
  })

  it('offline devuelve la caché sin llamar al fetcher', async () => {
    await guardarCacheCatalogo([prod('a'), prod('b')])
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const fetcher = vi.fn(async () => ({ items: [], hasMore: false }))
    const res = await obtenerCatalogo(fetcher)
    expect(res.desdeCache).toBe(true)
    expect(res.items).toHaveLength(2)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
