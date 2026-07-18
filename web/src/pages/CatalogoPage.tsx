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
  const offsetRef = useRef(0)
  const cargandoRef = useRef(false)

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
      { rootMargin: '200px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [hasMore, cargarPagina])

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
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')

  return (
    <div className="catalogo">
      <header className="catalogo-toolbar">
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
          >▦</button>
          <button
            className={vista === 'lista' ? 'active' : ''}
            onClick={() => setVista('lista')}
            aria-pressed={vista === 'lista'}
            title="Lista"
          >≡</button>
        </div>
        <button className="primary" onClick={() => setShowNuevo(true)}>+ Nuevo producto</button>
      </header>

      <div className="catalogo-body">
        <aside className="catalogo-sidebar">
          <h3>Categorías</h3>
          <ul>
            <li>
              <button
                className={categoriaFiltro === '' ? 'active' : ''}
                onClick={() => setCategoriaFiltro('')}
              >Todas</button>
            </li>
            {categorias.map((c) => (
              <li key={c.id}>
                <button
                  className={categoriaFiltro === c.id ? 'active' : ''}
                  onClick={() => setCategoriaFiltro(c.id)}
                >{c.nombre}</button>
              </li>
            ))}
          </ul>
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
        </aside>

        <main className="catalogo-main">
          {error && <p className="error">{error}</p>}

          {loading ? (
            <p>Cargando…</p>
          ) : productos.length === 0 ? (
            <p>No hay productos para los filtros actuales</p>
          ) : vista === 'grid' ? (
            <div className="productos-grid">
              {productos.map((p) => (
                <article key={p.id} className={`card-producto ${p.activo ? '' : 'inactivo'}`}>
                  <div className="card-img">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                    ) : (
                      <span className="thumb-empty">—</span>
                    )}
                    {!p.activo && <span className="ribbon off">inactivo</span>}
                  </div>
                  <div className="card-info">
                    <div className="card-sku"><code>{p.sku ?? '—'}</code></div>
                    <div className="card-nombre">{p.nombre}</div>
                    <div className="card-meta">
                      <span>{p.categoria?.nombre ?? '—'}</span>
                    </div>
                    <div className="card-precio">
                      {p.precio_usd > 0 ? (
                        `$${p.precio_usd.toFixed(2)}`
                      ) : (
                        <span className="badge warn">sin precio</span>
                      )}
                    </div>
                    <div className="card-stock">
                      Stock: {p.stock_actual}
                      {p.stock_actual <= p.stock_minimo && p.stock_minimo > 0 && (
                        <span className="badge warn">mín</span>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => setEditId(p.id)}>Editar</button>
                    {p.activo ? (
                      <button onClick={() => onDesactivar(p)}>Desactivar</button>
                    ) : (
                      <button onClick={() => onReactivar(p)}>Reactivar</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th></th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th className="num">Precio USD</th>
                  <th className="num">Stock</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className={p.activo ? '' : 'inactivo'}>
                    <td><code>{p.sku ?? '—'}</code></td>
                    <td className="thumb">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                      ) : (
                        <span className="thumb-empty">—</span>
                      )}
                    </td>
                    <td>{p.nombre}</td>
                    <td>{p.categoria?.nombre ?? '—'}</td>
                    <td className="num">
                      {p.precio_usd > 0 ? (
                        `$${p.precio_usd.toFixed(2)}`
                      ) : (
                        <span className="badge warn">sin precio</span>
                      )}
                    </td>
                    <td className="num">
                      {p.stock_actual}
                      {p.stock_actual <= p.stock_minimo && p.stock_minimo > 0 && (
                        <span className="badge warn">mín</span>
                      )}
                    </td>
                    <td>
                      {p.activo ? (
                        <span className="badge ok">activo</span>
                      ) : (
                        <span className="badge off">inactivo</span>
                      )}
                    </td>
                    <td className="actions">
                      <button onClick={() => setEditId(p.id)}>Editar</button>
                      {p.activo ? (
                        <button onClick={() => onDesactivar(p)}>Desactivar</button>
                      ) : (
                        <button onClick={() => onReactivar(p)}>Reactivar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {loadingMore && <p className="loading-more">Cargando más…</p>}
          <div ref={sentinelaRef} className="sentinela" />
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
