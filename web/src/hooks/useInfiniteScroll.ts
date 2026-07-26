import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_SIZE } from '../lib/productos'

export type FetchResult<T> = { items: T[]; hasMore: boolean }

export type UseInfiniteScrollOpts<T, F extends Record<string, unknown>> = {
  fetcher: (args: { offset: number; pageSize: number } & F) => Promise<FetchResult<T>>
  /** Cambios en filters → offset=0 y recarga. Debe ser memoizado por el consumidor. */
  filters: F
  pageSize?: number
  rootMargin?: string
  /** Elemento raíz para el IntersectionObserver (null = viewport). */
  root?: HTMLElement | null
}

export type UseInfiniteScrollReturn<T> = {
  items: T[]
  hasMore: boolean
  loadingMore: boolean
  loading: boolean
  error: string
  /** Ref del sentinel. El consumidor lo coloca en el DOM. */
  sentinelRef: React.RefObject<HTMLDivElement>
  /** Reset manual (ej. después de borrar un producto). */
  reset: () => void
}

/**
 * Hook de scroll infinito reutilizable.
 *
 * - Gestiona offset, hasMore, loading, loadingMore, error.
 * - IntersectionObserver en sentinelRef (colocado por el consumidor).
 * - Reset automático cuando `filters` cambia (dependencia por referencia).
 * - En error, mantiene los items existentes.
 */
export function useInfiniteScroll<T, F extends Record<string, unknown>>({
  fetcher,
  filters,
  pageSize = PAGE_SIZE,
  rootMargin = '200px',
  root = null,
}: UseInfiniteScrollOpts<T, F>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const cargandoRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  const filtersRef = useRef(filters)
  const [resetCounter, setResetCounter] = useState(0)

  // Mantener refs actualizadas con los últimos valores
  fetcherRef.current = fetcher
  filtersRef.current = filters

  // Resetear offset cuando los filtros cambian (dependencia por referencia)
  useEffect(() => {
    offsetRef.current = 0
    setResetCounter((c) => c + 1)
  }, [filters])

  const cargarPagina = useCallback(
    async (reset: boolean) => {
      if (cargandoRef.current) return
      cargandoRef.current = true
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError('')
      try {
        const offset = reset ? 0 : offsetRef.current
        const res = await fetcherRef.current({ offset, pageSize, ...filtersRef.current })
        if (reset) {
          setItems(res.items)
          offsetRef.current = res.items.length
        } else {
          setItems((prev) => [...prev, ...res.items])
          offsetRef.current += res.items.length
        }
        setHasMore(res.hasMore)
      } catch (err) {
        setError((err as Error).message)
        // Mantener items existentes en caso de error
      } finally {
        cargandoRef.current = false
        if (reset) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    },
    [pageSize]
  )

  // Carga inicial y recarga cuando filtros cambian
  useEffect(() => {
    cargarPagina(true)
  }, [cargarPagina, resetCounter])

  // IntersectionObserver
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !cargandoRef.current) {
          cargarPagina(false)
        }
      },
      { root, rootMargin }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [hasMore, cargarPagina, root, rootMargin, loading])

  const reset = useCallback(() => {
    offsetRef.current = 0
    setResetCounter((c) => c + 1)
  }, [])

  return { items, hasMore, loadingMore, loading, error, sentinelRef, reset }
}
