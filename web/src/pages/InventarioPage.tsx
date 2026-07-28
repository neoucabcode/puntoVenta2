import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  listarProductos,
  listarCategorias,
  desactivarProducto,
  reactivarProducto,
  eliminarProducto,

  calcularValuacion,
  registrarHistorial,
  type ProductoJoin,
  type Categoria,
} from '../lib/productos'
import { obtenerMiEmpresaId } from '../lib/empresa'
import { exportarCatalogo } from '../lib/catalogo'
import { ProductoForm } from '../components/ProductoForm'
import { CatalogImportModal } from '../components/CatalogImportModal'
import { DataTable } from '../components/DataTable'
import { ConfirmarEliminarModal } from '../components/ConfirmarEliminarModal'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useUsuarioRol } from '../hooks/useUsuarioRol'

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function esBajoStock(p: ProductoJoin): boolean {
  return p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
}

type DeleteTarget = { producto: ProductoJoin; mode: 'desactivar' | 'eliminar' }

export function InventarioPage() {
  const { inventarioHabilitado, esAdmin } = useUsuarioRol()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [vista, setVista] = useState<'grid' | 'lista'>('lista')
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)
  const [actionError, setActionError] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const listaScrollRef = useRef<HTMLDivElement | null>(null)
  const filtroCatRef = useRef<HTMLSelectElement>(null)

  // Memoizar filtros: el hook solo resetea offset cuando cambia la referencia
  const filters = useMemo(
    () => ({ search, categoriaId: categoriaFiltro || null, soloActivos: false }),
    [search, categoriaFiltro]
  )

  const { items, loadingMore, loading, error, sentinelRef, reset } = useInfiniteScroll({
    fetcher: async ({ offset, pageSize, search, categoriaId, soloActivos }) => {
      const res = await listarProductos({
        search, categoriaId, soloActivos, offset, pageSize,
      })
      return { items: res.items, hasMore: res.hasMore }
    },
    filters,
    root: scrollRoot,
  })

  // Actualizar root del IntersectionObserver cuando cambia la vista
  useEffect(() => {
    setScrollRoot(vista === 'grid' ? gridScrollRef.current : listaScrollRef.current)
  }, [vista])

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch((err) => setActionError((err as Error).message))
  }, [])

  const valuacion = useMemo(() => calcularValuacion(items), [items])


  function onDesactivarClick(p: ProductoJoin) {
    setDeleteTarget({ producto: p, mode: 'desactivar' })
  }

  function onEliminarClick(p: ProductoJoin) {
    setDeleteTarget({ producto: p, mode: 'eliminar' })
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return
    setDeleteSaving(true)
    setActionError('')
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (deleteTarget.mode === 'desactivar') {
        await desactivarProducto(deleteTarget.producto.id)
        if (empresaId) {
          registrarHistorial(empresaId, deleteTarget.producto.id, deleteTarget.producto.nombre, 'desactivado', {})
        }
      } else {
        await eliminarProducto(deleteTarget.producto.id)
        if (empresaId) {
          registrarHistorial(empresaId, deleteTarget.producto.id, deleteTarget.producto.nombre, 'eliminado', {})
        }
      }
      setDeleteTarget(null)
      reset()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setDeleteSaving(false)
    }
  }

  async function onReactivar(p: ProductoJoin) {
    try {
      await reactivarProducto(p.id)
      const empresaId = await obtenerMiEmpresaId()
      if (empresaId) {
        registrarHistorial(empresaId, p.id, p.nombre, 'reactivado', {})
      }
      reset()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function onExportarCatalogo() {
    setExporting(true)
    setActionError('')
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (!empresaId) throw new Error('No se pudo determinar la empresa')
      const blob = await exportarCatalogo(empresaId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `catalogo-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setExporting(false)
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

  const edicion = editId ? items.find((p) => p.id === editId) ?? null : null

  return (
    <div className="inventario">
      <header className="inv-toolbar">
        <div className="inv-filtros">
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
          {esAdmin && (
            <>
              <button
                className="icon-only"
                onClick={() => void onExportarCatalogo()}
                disabled={exporting}
                title="Exportar catálogo"
                aria-label="Exportar catálogo"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
              <button
                className="icon-only"
                onClick={() => setShowImportModal(true)}
                title="Importar catálogo"
                aria-label="Importar catálogo"
              >
                <span className="material-symbols-outlined">upload</span>
              </button>
            </>
          )}
          <button
            className="primary icon-only"
            onClick={() => setShowNuevo(true)}
            title="Nuevo producto"
            aria-label="Nuevo producto"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      <div className="inv-body">
        <main className="inv-main">
          {(error || actionError) && <p className="error">{error || actionError}</p>}

          {loading ? (
            <p>Cargando…</p>
          ) : vista === 'grid' ? (
            <div className="productos-grid-scroll" ref={gridScrollRef}>
              <div className="productos-grid">
                {items.map((p) => (
                  <article key={p.id} className={`card-producto ${p.activo ? '' : 'inactivo'}`}>
                    <div className="card-img">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                      ) : (
                        <span className="thumb-empty material-symbols-outlined">inventory_2</span>
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
                <div ref={sentinelRef} className="sentinela" />
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
        filas={items}
        rowKey={(p) => p.id}
        isInactivo={(p) => !p.activo}
        empty="No hay productos para los filtros actuales"
        scrollRef={listaScrollRef}
        after={<div ref={sentinelRef} className="sentinela" />}
      />)}

          {loadingMore && <p className="loading-more">Cargando más…</p>}
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
            reset()
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmarEliminarModal
          productoNombre={deleteTarget.producto.nombre}
          onConfirm={() => void onConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
          saving={deleteSaving}
        />
      )}

      {showImportModal && (
        <CatalogImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false)
            reset()
          }}
        />
      )}
    </div>
  )
}
