import { useEffect, useState, useRef, useMemo } from 'react'
import {
  listarProductos,
  listarCategorias,
  type ProductoJoin,
  type Categoria,
} from '../lib/productos'
import { obtenerCatalogo } from '../lib/cacheCatalogo'
import { useUIStore } from '../lib/ui-store'
import { useCajaStore } from '../store/useCajaStore'
import { fmtBs } from '../types/carrito'
import { DataTable } from '../components/DataTable'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

export function CatalogoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const soloActivos = useUIStore((s) => s.soloActivos)
  const ocultarAgotados = useUIStore((s) => s.ocultarAgotados)
  const tasaBCV = useCajaStore((s) => s.tasaBCV)
  const [usandoCache, setUsandoCache] = useState(false)
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)
  const [categoriasError, setCategoriasError] = useState('')
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const listaScrollRef = useRef<HTMLDivElement | null>(null)
  const filtroCatRef = useRef<HTMLSelectElement>(null)

  // Memoizar filtros: el hook solo resetea offset cuando cambia la referencia
  const filters = useMemo(
    () => ({ search, categoriaId: categoriaFiltro || null, soloActivos, ocultarAgotados }),
    [search, categoriaFiltro, soloActivos, ocultarAgotados]
  )

  // El catálogo es SOLO LECTURA de forma permanente (Slice 1): lista, búsqueda y
  // filtrado. La edición de productos/categorías vive en `/inventario`.
  const { items, loadingMore, loading, error, sentinelRef } = useInfiniteScroll({
    fetcher: async ({ offset, pageSize, search, categoriaId, soloActivos }) => {
      // W1: usa la caché local cuando está offline o falla Supabase; marca
      // `desdeCache` para mostrar el indicador de catálogo sin conexión.
      const res = await obtenerCatalogo(
        () =>
          listarProductos({
            search,
            categoriaId,
            soloActivos,
            offset,
            pageSize: (pageSize ?? 50) + (ocultarAgotados ? 20 : 0), // fetch extra to compensate filtering
          }),
        { guardarEnCache: offset === 0 }
      )
      setUsandoCache(res.desdeCache)
      return { items: res.items, hasMore: res.hasMore }
    },
    filters,
    root: scrollRoot,
  })

  // Actualizar root del IntersectionObserver cuando cambia la vista
  useEffect(() => {
    setScrollRoot(vista === 'grid' ? gridScrollRef.current : listaScrollRef.current)
  }, [vista])

  // Filtro cliente: ocultar agotados (stock_actual <= 0)
  const displayItems = useMemo(
    () => ocultarAgotados ? items.filter((p) => p.stock_actual > 0) : items,
    [items, ocultarAgotados]
  )

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch((err) => setCategoriasError((err as Error).message))
  }, [])

  function stockEstado(p: ProductoJoin): 'ok' | 'warn' | 'off' {
    if (!p.activo) return 'off'
    if (p.stock_actual <= 0) return 'off'
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo) return 'warn'
    return 'ok'
  }

  function onImgError(id: string) {
    setImgErrors((prev) => new Set(prev).add(id))
  }
  const stockLabel: Record<'ok' | 'warn' | 'off', string> = {
    ok: 'En stock',
    warn: 'Stock bajo',
    off: 'Agotado',
  }

  return (
    <div className="catalogo">
      <header className="catalogo-toolbar">
        <div className="catalogo-filtros">
          <select
            ref={filtroCatRef}
            className="filtro-cat"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button
            className="filtro-cat-mobile"
            type="button"
            aria-label="Filtrar por categoría"
            onClick={() => {
              const sel = filtroCatRef.current
              if (sel?.showPicker) sel.showPicker()
              else sel?.click()
            }}
          >
            <span className="material-symbols-outlined">category</span>
            <span className="filtro-cat-label">Cat</span>
          </button>
        </div>
        <div className="catalogo-head-actions">
          <input
            className="buscador"
            placeholder="Buscar por nombre, SKU o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="toggle-vista" role="group" aria-label="Vista">
            <button
              className={vista === 'grid' ? 'active' : ''}
              onClick={() => setVista('grid')}
              aria-pressed={vista === 'grid'}
              title="Cuadrícula"
            ><span className="material-symbols-outlined">grid_view</span></button>
            <button
              className={vista === 'lista' ? 'active' : ''}
              onClick={() => setVista('lista')}
              aria-pressed={vista === 'lista'}
              title="Lista"
            ><span className="material-symbols-outlined">list</span></button>
          </div>
        </div>
      </header>

      <div className="catalogo-body">
        <main className="catalogo-main">
           {(error || categoriasError) && <p className="error">{error || categoriasError}</p>}
           {usandoCache && (
            <p className="aviso-cache">catálogo sin conexión (cached)</p>
          )}

          {loading ? (
            <p>Cargando…</p>
          ) : displayItems.length === 0 ? (
            <p>No hay productos para los filtros actuales</p>
          ) : vista === 'grid' ? (
            <div className="productos-grid-scroll" ref={gridScrollRef}>
              <div className="productos-grid">
                {displayItems.map((p) => {
                  const st = stockEstado(p)
                  return (
                    <article key={p.id} className={`card-producto ${p.activo ? '' : 'inactivo'}`}>
                      <div className="card-img">
                        {p.imagen_url && !imgErrors.has(p.id) ? (
                          <img src={p.imagen_url} alt={p.nombre} loading="lazy" onError={() => onImgError(p.id)} />
                        ) : (
                          <span className="thumb-empty material-symbols-outlined">
                            {imgErrors.has(p.id) ? 'broken_image' : 'inventory_2'}
                          </span>
                        )}
                        <div className={`card-stock ${st === 'ok' ? 'ok' : st === 'warn' ? 'warn' : 'off'}`}>
                          {p.stock_actual} uds
                        </div>
                      </div>
                      <div className="card-info">
                        <div className="card-nombre">{p.nombre}</div>
                        <div className="card-meta">
                          <span>{p.categoria?.nombre ?? '—'}</span>
                        </div>
                        <div className="card-footer">
                          <div className="card-precio">
                            {p.precio_usd > 0 ? (
                              <>
                                <span className="card-precio-usd">${p.precio_usd.toFixed(2)}</span>
                                <span className="card-precio-bs">{fmtBs(p.precio_usd * tasaBCV)}</span>
                              </>
                            ) : (
                              <span className="badge warn">sin precio</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
                <div ref={sentinelRef} className="sentinela" />
              </div>
            </div>
          ) : (
            <DataTable
              columnas={[
                { key: 'sku', titulo: 'SKU', render: (p: ProductoJoin) => <code>{p.sku ?? '—'}</code> },
                {
                  key: 'img', titulo: '', hideHeader: true, className: 'dt-thumb',
                  render: (p: ProductoJoin) =>
                    p.imagen_url && !imgErrors.has(p.id) ? (
                      <img src={p.imagen_url} alt={p.nombre} loading="lazy" onError={() => onImgError(p.id)} />
                    ) : (
                      <span className="dt-thumb-empty material-symbols-outlined">
                        {imgErrors.has(p.id) ? 'broken_image' : 'inventory_2'}
                      </span>
                    ),
                },
                { key: 'nombre', titulo: 'Nombre', render: (p: ProductoJoin) => p.nombre },
                { key: 'categoria', titulo: 'Categoría', render: (p: ProductoJoin) => p.categoria?.nombre ?? '—' },
                {
                  key: 'precio', titulo: 'Precio USD', align: 'right',
                  render: (p: ProductoJoin) =>
                    p.precio_usd > 0 ? (
                      `$${p.precio_usd.toFixed(2)}`
                    ) : (
                      <span className="badge warn">sin precio</span>
                    ),
                },
                { key: 'stock', titulo: 'Stock', align: 'right', render: (p: ProductoJoin) => p.stock_actual },
                {
                  key: 'estado', titulo: 'Estado',
                  render: (p: ProductoJoin) => <span className={`badge ${stockEstado(p)}`}>{stockLabel[stockEstado(p)]}</span>,
                },
              ]}
              filas={displayItems}
              rowKey={(p) => p.id}
              isInactivo={(p) => !p.activo}
              empty="No hay productos para los filtros actuales"
              scrollRef={listaScrollRef}
              after={<div ref={sentinelRef} className="sentinela" />}
            />
          )}

          {loadingMore && <p className="loading-more">Cargando más…</p>}
        </main>
      </div>
    </div>
  )
}
