import { useEffect, useState, useRef, useCallback } from 'react'
import {
  listarProductos,
  listarCategorias,
  desactivarProducto,
  reactivarProducto,
  crearCategoria,
  PAGE_SIZE,
  type ProductoJoin,
  type Categoria,
} from '../lib/productos'
import { ProductoForm } from '../components/ProductoForm'
import { DataTable } from '../components/DataTable'

export function CatalogoPage() {
  const [productos, setProductos] = useState<ProductoJoin[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const sentinelaRef = useRef<HTMLDivElement | null>(null)
  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const listaScrollRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const cargandoRef = useRef(false)
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')

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
        const res = await listarProductos({
          search,
          categoriaId: categoriaFiltro || null,
          soloActivos,
          offset,
          pageSize: PAGE_SIZE,
        })
        if (reset) {
          setProductos(res.items)
          offsetRef.current = res.items.length
        } else {
          setProductos((prev) => [...prev, ...res.items])
          offsetRef.current += res.items.length
        }
        setHasMore(res.hasMore)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        cargandoRef.current = false
        if (reset) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    },
    [search, categoriaFiltro, soloActivos]
  )

  useEffect(() => {
    cargarPagina(true)
  }, [cargarPagina])

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch((err) => setError((err as Error).message))
  }, [])

  async function refrescar() {
    await cargarPagina(true)
  }

  useEffect(() => {
    const node = sentinelaRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !cargandoRef.current) {
          cargarPagina(false)
        }
      },
      { root: vista === 'grid' ? gridScrollRef.current : listaScrollRef.current, rootMargin: '200px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [hasMore, cargarPagina, vista])

  async function onDesactivar(p: ProductoJoin) {
    if (!confirm(`¿Desactivar "${p.nombre}"? Queda en el historial pero no se venderá más.`)) return
    try {
      await desactivarProducto(p.id)
      setProductos((prev) =>
        soloActivos ? prev.filter((x) => x.id !== p.id) : prev.map((x) => (x.id === p.id ? { ...x, activo: false } : x))
      )
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function onReactivar(p: ProductoJoin) {
    try {
      await reactivarProducto(p.id)
      setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: true } : x)))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function onCrearCategoria() {
    const n = nuevaCategoria.trim()
    if (!n) return
    try {
      const c = await crearCategoria(n)
      setCategorias((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCategoriaFiltro(c.id)
      setNuevaCategoria('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const edicion = editId ? productos.find((p) => p.id === editId) ?? null : null

  function stockEstado(p: ProductoJoin): 'ok' | 'warn' | 'off' {
    if (!p.activo) return 'off'
    if (p.stock_actual <= 0) return 'off'
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo) return 'warn'
    return 'ok'
  }
  const stockLabel: Record<'ok' | 'warn' | 'off', string> = {
    ok: 'En stock',
    warn: 'Stock bajo',
    off: 'Agotado',
  }

  return (
    <div className="catalogo">
      <header className="catalogo-toolbar">
        <div className="catalogo-head">
          <h2 className="catalogo-title">Catálogo de productos</h2>
          <p className="catalogo-sub">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        <div className="catalogo-filtros">
          <select
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
          <details className="nueva-cat">
            <summary>+ Nueva categoría</summary>
            <div className="row">
              <input
                placeholder="Nombre"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
              />
              <button onClick={onCrearCategoria}>Crear</button>
            </div>
          </details>
        </div>
        <div className="catalogo-head-actions">
          <input
            className="buscador"
            placeholder="Buscar por nombre, SKU o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
            />
            Solo activos
          </label>
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
          <button className="primary" onClick={() => setShowNuevo(true)}>
            <span className="material-symbols-outlined">add</span> Nuevo producto
          </button>
        </div>
      </header>

      <div className="catalogo-body">
        <main className="catalogo-main">
          {error && <p className="error">{error}</p>}

          {loading ? (
            <p>Cargando…</p>
          ) : productos.length === 0 ? (
            <p>No hay productos para los filtros actuales</p>
          ) : vista === 'grid' ? (
            <div className="productos-grid-scroll" ref={gridScrollRef}>
              <div className="productos-grid">
                {productos.map((p) => {
                  const st = stockEstado(p)
                  return (
                    <article key={p.id} className={`card-producto ${p.activo ? '' : 'inactivo'}`}>
                      <div className="card-img">
                        {p.imagen_url ? (
                          <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                        ) : (
                          <span className="thumb-empty material-symbols-outlined">image</span>
                        )}
                        <span className={`ribbon ${st}`}>{stockLabel[st]}</span>
                      </div>
                      <div className="card-info">
                        <div className="card-sku"><code>{p.sku ?? '—'}</code></div>
                        <div className="card-nombre">{p.nombre}</div>
                        <div className="card-meta">
                          <span>{p.categoria?.nombre ?? '—'}</span>
                        </div>
                        <div className="card-footer">
                          <div className="card-precio">
                            {p.precio_usd > 0 ? (
                              `$${p.precio_usd.toFixed(2)}`
                            ) : (
                              <span className="badge warn">sin precio</span>
                            )}
                          </div>
                          <div className={`card-stock ${st === 'off' ? 'off' : st === 'warn' ? 'warn' : ''}`}>
                            {p.stock_actual} uds
                          </div>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button onClick={() => setEditId(p.id)}>
                          <span className="material-symbols-outlined">edit</span> Editar
                        </button>
                        {p.activo ? (
                          <button onClick={() => onDesactivar(p)}>
                            <span className="material-symbols-outlined">delete</span> Desactivar
                          </button>
                        ) : (
                          <button onClick={() => onReactivar(p)}>
                            <span className="material-symbols-outlined">check_circle</span> Reactivar
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
                <div ref={sentinelaRef} className="sentinela" />
              </div>
            </div>
          ) : (
            <DataTable
              columnas={[
                { key: 'sku', titulo: 'SKU', render: (p: ProductoJoin) => <code>{p.sku ?? '—'}</code> },
                {
                  key: 'img', titulo: '', hideHeader: true, className: 'dt-thumb',
                  render: (p: ProductoJoin) =>
                    p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                    ) : (
                      <span className="dt-thumb-empty material-symbols-outlined">image</span>
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
                {
                  key: 'acciones', titulo: '', hideHeader: true, className: 'dt-actions',
                  render: (p: ProductoJoin) => (
                    <>
                      <button onClick={() => setEditId(p.id)} title="Editar">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      {p.activo ? (
                        <button onClick={() => onDesactivar(p)} title="Desactivar">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      ) : (
                        <button onClick={() => onReactivar(p)} title="Reactivar">
                          <span className="material-symbols-outlined">check_circle</span>
                        </button>
                      )}
                    </>
                  ),
                },
              ]}
              filas={productos}
              rowKey={(p) => p.id}
              isInactivo={(p) => !p.activo}
              empty="No hay productos para los filtros actuales"
              scrollRef={listaScrollRef}
              after={<div ref={sentinelaRef} className="sentinela" />}
            />
          )}

          {loadingMore && <p className="loading-more">Cargando más…</p>}
        </main>
      </div>

      {(showNuevo || edicion) && (
        <ProductoForm
          producto={edicion}
          categorias={categorias}
          onClose={() => {
            setShowNuevo(false)
            setEditId(null)
          }}
          onSaved={() => {
            setShowNuevo(false)
            setEditId(null)
            refrescar()
          }}
        />
      )}
    </div>
  )
}
