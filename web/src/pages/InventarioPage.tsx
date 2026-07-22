import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  listarProductos,
  listarCategorias,
  desactivarProducto,
  reactivarProducto,
  eliminarProducto,
  crearCategoria,
  calcularValuacion,
  aplicarAjusteStock,
  registrarHistorial,
  obtenerHistorial,
  PAGE_SIZE,
  type ProductoJoin,
  type Categoria,
  type HistorialEntry,
} from '../lib/productos'
import { obtenerMiEmpresaId } from '../lib/empresa'
import { ProductoForm } from '../components/ProductoForm'
import { SkuConfigForm } from '../components/SkuConfigForm'
import { DataTable } from '../components/DataTable'
import { ConfirmarEliminarModal } from '../components/ConfirmarEliminarModal'
import { HistorialModal } from '../components/HistorialModal'
import { useUsuarioRol } from '../hooks/useUsuarioRol'

const MOTIVOS_AJUSTE = ['conteo físico', 'merma', 'devolución', 'otro'] as const

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function esBajoStock(p: ProductoJoin): boolean {
  return p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
}

type DeleteTarget = { producto: ProductoJoin; mode: 'desactivar' | 'eliminar' }

export function InventarioPage() {
  const { inventarioHabilitado, esAdmin } = useUsuarioRol()

  const [productos, setProductos] = useState<ProductoJoin[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [vista, setVista] = useState<'grid' | 'lista'>('lista')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')

  const [ajusteOpen, setAjusteOpen] = useState(false)
  const [ajusteProductoId, setAjusteProductoId] = useState('')
  const [ajusteCantidad, setAjusteCantidad] = useState('')
  const [ajusteMotivo, setAjusteMotivo] = useState<string>(MOTIVOS_AJUSTE[0])
  const [ajusteError, setAjusteError] = useState('')
  const [ajusteSaving, setAjusteSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialEntries, setHistorialEntries] = useState<HistorialEntry[]>([])
  const [historialLoading, setHistorialLoading] = useState(false)

  const [skuConfigOpen, setSkuConfigOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [prods, cats] = await Promise.all([
        listarProductos({
          search,
          categoriaId: categoriaFiltro || null,
          soloActivos: false,
          offset: 0,
          pageSize: PAGE_SIZE,
        }),
        listarCategorias(),
      ])
      setProductos(prods.items)
      setCategorias(cats)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [search, categoriaFiltro])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const valuacion = useMemo(() => calcularValuacion(productos), [productos])
  const bajos = useMemo(() => productos.filter(esBajoStock), [productos])

  function onDesactivarClick(p: ProductoJoin) {
    setDeleteTarget({ producto: p, mode: 'desactivar' })
  }

  function onEliminarClick(p: ProductoJoin) {
    setDeleteTarget({ producto: p, mode: 'eliminar' })
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return
    setDeleteSaving(true)
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (deleteTarget.mode === 'desactivar') {
        await desactivarProducto(deleteTarget.producto.id)
        setProductos((prev) =>
          prev.map((x) => (x.id === deleteTarget.producto.id ? { ...x, activo: false } : x))
        )
        if (empresaId) {
          registrarHistorial(empresaId, deleteTarget.producto.id, deleteTarget.producto.nombre, 'eliminado', {})
        }
      } else {
        await eliminarProducto(deleteTarget.producto.id)
        setProductos((prev) => prev.filter((x) => x.id !== deleteTarget.producto.id))
        if (empresaId) {
          registrarHistorial(empresaId, deleteTarget.producto.id, deleteTarget.producto.nombre, 'eliminado', {})
        }
      }
      setDeleteTarget(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleteSaving(false)
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

  async function onAjustar() {
    setAjusteError('')
    const cantidad = parseFloat(ajusteCantidad)
    if (!ajusteProductoId) {
      setAjusteError('Selecciona el producto a ajustar')
      return
    }
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      setAjusteError('La cantidad debe ser un número distinto de cero')
      return
    }
    setAjusteSaving(true)
    try {
      await aplicarAjusteStock({
        productoId: ajusteProductoId,
        cantidad,
        motivo: ajusteMotivo,
      })
      const empresaId = await obtenerMiEmpresaId()
      if (empresaId) {
        const ajustado = productos.find((p) => p.id === ajusteProductoId)
        if (ajustado) {
          registrarHistorial(empresaId, ajustado.id, ajustado.nombre, 'ajuste_stock', {
            cantidad,
            motivo: ajusteMotivo,
          })
        }
      }
      setAjusteOpen(false)
      setAjusteProductoId('')
      setAjusteCantidad('')
      setAjusteMotivo(MOTIVOS_AJUSTE[0])
      await cargar()
    } catch (err) {
      setAjusteError((err as Error).message)
    } finally {
      setAjusteSaving(false)
    }
  }

  async function onAbrirHistorial() {
    setHistorialOpen(true)
    setHistorialLoading(true)
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (empresaId) {
        const entries = await obtenerHistorial(empresaId)
        setHistorialEntries(entries)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setHistorialLoading(false)
    }
  }

  if (!inventarioHabilitado) {
    return (
      <div className="inv-denegado" role="alert">
        <span className="material-symbols-outlined">lock</span>
        <h2>Acceso restringido</h2>
        <p>No tienes permiso para gestionar el inventario. Esta sección es solo para administradores.</p>
        <Link to="/" className="primary">Volver a la caja</Link>
      </div>
    )
  }

  const edicion = editId ? productos.find((p) => p.id === editId) ?? null : null

  return (
    <div className="inventario">
      <header className="inv-toolbar">
        <div className="inv-head">
          <p className="inv-sub">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
            {bajos.length > 0 && (
              <span className="inv-badge-bajo resumen">
                {bajos.length} con bajo stock
              </span>
            )}
          </p>
        </div>
        <div className="inv-filtros">
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
        </div>
        <div className="inv-acciones">
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
          <details className="nueva-cat">
            <summary>+ Categoría</summary>
            <div className="row">
              <input
                placeholder="Nombre"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void onCrearCategoria() }}
              />
              <button onClick={() => void onCrearCategoria()}>Crear</button>
            </div>
          </details>
          <button className="ghost" onClick={() => void onAbrirHistorial()}>
            <span className="material-symbols-outlined">history</span> Historial
          </button>
          <button className="ghost" onClick={() => setAjusteOpen(true)}>
            <span className="material-symbols-outlined">scale</span> Ajuste de stock
          </button>
          {esAdmin && (
            <button className="ghost" onClick={() => setSkuConfigOpen(true)}>
              <span className="material-symbols-outlined">settings</span> Configurar SKU
            </button>
          )}
          <button className="primary" onClick={() => setShowNuevo(true)}>
            <span className="material-symbols-outlined">add</span> Nuevo producto
          </button>
        </div>
      </header>

      <div className="inv-body">
        <main className="inv-main">
          {error && <p className="error">{error}</p>}

          {loading ? (
            <p>Cargando…</p>
          ) : vista === 'grid' ? (
            <div className="productos-grid-scroll">
              <div className="productos-grid">
                {productos.map((p) => (
                  <article key={p.id} className={`card-producto ${p.activo ? '' : 'inactivo'}`}>
                    <div className="card-img">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                      ) : (
                        <span className="thumb-empty material-symbols-outlined">image</span>
                      )}
                      {esBajoStock(p) && (
                        <span className="ribbon warn" title={`Por debajo del mínimo (${p.stock_minimo})`}>
                          <span className="material-symbols-outlined">warning</span> Bajo stock
                        </span>
                      )}
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
                        <div className={`card-stock ${!p.activo ? 'off' : esBajoStock(p) ? 'warn' : ''}`}>
                          {p.stock_actual} uds
                        </div>
                      </div>
                      <div className="card-costo">
                        <span className="num-tab">{fmtUsd(p.costo_usd)}</span>
                      </div>
                      <div className="card-actions">
                        <button onClick={() => setEditId(p.id)} title="Editar">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        {p.activo ? (
                          <>
                            <button onClick={() => onDesactivarClick(p)} title="Desactivar">
                              <span className="material-symbols-outlined">visibility_off</span>
                            </button>
                            <button onClick={() => onEliminarClick(p)} title="Eliminar permanentemente">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </>
                        ) : (
                          <button onClick={() => void onReactivar(p)} title="Reactivar">
                            <span className="material-symbols-outlined">check_circle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <DataTable
        columnas={[
          { key: 'sku', titulo: 'SKU', render: (p: ProductoJoin) => <code>{p.sku ?? '—'}</code> },
          { key: 'nombre', titulo: 'Nombre', render: (p: ProductoJoin) => p.nombre },
          { key: 'categoria', titulo: 'Categoría', render: (p: ProductoJoin) => p.categoria?.nombre ?? '—' },
          {
            key: 'costo', titulo: 'Costo', align: 'right',
            render: (p: ProductoJoin) => <span className="num-tab">{fmtUsd(p.costo_usd)}</span>,
          },
          {
            key: 'precio', titulo: 'Precio', align: 'right',
            render: (p: ProductoJoin) => <span className="num-tab">{fmtUsd(p.precio_usd)}</span>,
          },
          {
            key: 'stock', titulo: 'Stock', align: 'right',
            render: (p: ProductoJoin) => (
              <span className="inv-stock">
                <span className="num-tab">{p.stock_actual}</span>
                {esBajoStock(p) && (
                  <span className="inv-badge-bajo" title={`Por debajo del mínimo (${p.stock_minimo})`}>
                    <span className="material-symbols-outlined">warning</span> Bajo stock
                  </span>
                )}
              </span>
            ),
          },
          {
            key: 'acciones', titulo: '', hideHeader: true, className: 'dt-actions',
            render: (p: ProductoJoin) => (
              <>
                <button onClick={() => setEditId(p.id)} title="Editar">
                  <span className="material-symbols-outlined">edit</span>
                </button>
                {p.activo ? (
                  <>
                    <button onClick={() => onDesactivarClick(p)} title="Desactivar">
                      <span className="material-symbols-outlined">visibility_off</span>
                    </button>
                    <button onClick={() => onEliminarClick(p)} title="Eliminar permanentemente">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </>
                ) : (
                  <button onClick={() => void onReactivar(p)} title="Reactivar">
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
      />)}
        </main>
      </div>

      <footer className="inv-valuacion">
        <span className="inv-valuacion-label">Valuación de inventario</span>
        <span className="inv-valuacion-monto num-tab">{fmtUsd(valuacion)}</span>
        <span className="inv-valuacion-nota">Σ (costo × stock)</span>
      </footer>

      {(showNuevo || edicion) && (
        <ProductoForm
          producto={edicion}
          categorias={categorias}
          onClose={() => {
            setShowNuevo(false)
            setEditId(null)
          }}
          onSaved={async (p) => {
            setShowNuevo(false)
            setEditId(null)
            if (!edicion) {
              const empresaId = await obtenerMiEmpresaId()
              if (empresaId) {
                registrarHistorial(empresaId, p.id, p.nombre, 'creado', {})
              }
            } else {
              const empresaId = await obtenerMiEmpresaId()
              if (empresaId) {
                const campos: string[] = []
                if (edicion.nombre !== p.nombre) campos.push('nombre')
                if (edicion.precio_usd !== p.precio_usd) campos.push('precio_usd')
                if (edicion.costo_usd !== p.costo_usd) campos.push('costo_usd')
                if (edicion.stock_actual !== p.stock_actual) campos.push('stock_actual')
                if (edicion.stock_minimo !== p.stock_minimo) campos.push('stock_minimo')
                if (edicion.categoria_id !== p.categoria_id) campos.push('categoria_id')
                if (edicion.sku !== p.sku) campos.push('sku')
                if (edicion.codigo_barras !== p.codigo_barras) campos.push('codigo_barras')
                if (edicion.unidad !== p.unidad) campos.push('unidad')
                if (edicion.imagen_url !== p.imagen_url) campos.push('imagen_url')
                if (edicion.activo !== p.activo) campos.push('activo')
                if (campos.length > 0) {
                  registrarHistorial(empresaId, p.id, p.nombre, 'editado', { cambios: campos })
                }
              }
            }
            void cargar()
          }}
        />
      )}

      {ajusteOpen && (
        <div className="modal-backdrop" onClick={() => setAjusteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Ajuste de stock</h2>
              <button type="button" onClick={() => setAjusteOpen(false)} aria-label="Cerrar">×</button>
            </header>
            <div className="form-grid">
              <label className="span-2">
                Producto
                <select value={ajusteProductoId} onChange={(e) => setAjusteProductoId(e.target.value)}>
                  <option value="">Selecciona un producto…</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.stock_actual})</option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad (+/-)
                <input
                  type="number"
                  step="0.01"
                  value={ajusteCantidad}
                  onChange={(e) => setAjusteCantidad(e.target.value)}
                  placeholder="ej. 10 o -3"
                />
              </label>
              <label>
                Motivo
                <select value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)}>
                  {MOTIVOS_AJUSTE.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              {ajusteError && <p className="error span-2">{ajusteError}</p>}
              <footer className="span-2 modal-footer">
                <button type="button" onClick={() => setAjusteOpen(false)} disabled={ajusteSaving}>Cancelar</button>
                <button type="button" className="primary" onClick={() => void onAjustar()} disabled={ajusteSaving}>
                  {ajusteSaving ? 'Aplicando…' : 'Aplicar ajuste'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmarEliminarModal
          productoNombre={deleteTarget.producto.nombre}
          onConfirm={() => void onConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
          saving={deleteSaving}
        />
      )}

      {historialOpen && (
        <HistorialModal
          entries={historialEntries}
          loading={historialLoading}
          onClose={() => setHistorialOpen(false)}
        />
      )}

      {skuConfigOpen && (
        <SkuConfigForm onClose={() => setSkuConfigOpen(false)} />
      )}
    </div>
  )
}
