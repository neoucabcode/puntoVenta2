import { useEffect, useMemo, useRef, useState } from 'react'
import { listarProductos, listarCategorias, type ProductoJoin, type Categoria } from '../lib/productos'
import { obtenerMiEmpresa } from '../lib/empresa'
import { registrarVentaOffline } from '../lib/ventaOffline'
import { useCajaStore } from '../store/useCajaStore'
import { useCarritoStore } from '../store/useCarritoStore'
import { Carrito, fmtUsd, fmtBs, parseMonto, NOMBRES_TIPO, TIPOS_DISPONIBLES } from '../components/Carrito'
import type { MetodoPago, TipoInstrumento, MonedaPago } from '../types/carrito'
import {
  marcarTasaSincronizada,
  leerTasaSincronizada,
} from '../lib/tasaSync'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

const CLIENTES_KEY = 'pv-clientes-recientes'

type VistaProductos = 'lista' | 'grid'
type Pantalla = 'venta' | 'pago'

export function PosPage() {
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const soloLectura = cajaHabilitada && !cajaAbierta

  // ─── Store selectors ────────────────────────────────────────────
  const items = useCarritoStore((s) => s.items)
  const metodoPago = useCarritoStore((s) => s.metodoPago)
  const cliente = useCarritoStore((s) => s.cliente)
  const cedula = useCarritoStore((s) => s.cedula)
  const instrumentos = useCarritoStore((s) => s.instrumentos)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [vista, setVista] = useState<VistaProductos>('lista')
  const [tasaActualizadaEn, setTasaActualizadaEn] = useState<string | null>(null)
  const [clientesRecientes, setClientesRecientes] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [pantalla, setPantalla] = useState<Pantalla>('venta')
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [carritoDrawerOpen, setCarritoDrawerOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)

  const busquedaRef = useRef<HTMLInputElement>(null)
  const gridScrollRef = useRef<HTMLDivElement | null>(null)

  // Debounce de busqueda: 300ms antes de disparar la query al servidor
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const filters = useMemo(
    () => ({
      search: busquedaDebounced,
      categoriaId: categoriaFiltro || null,
    }),
    [busquedaDebounced, categoriaFiltro]
  )

  const { items: productos, loading, loadingMore, error, sentinelRef } = useInfiniteScroll({
    fetcher: async ({ offset, pageSize, search, categoriaId }) => {
      const res = await listarProductos({
        search,
        categoriaId,
        soloActivos: true,
        offset,
        pageSize,
      })
      return { items: res.items, hasMore: res.hasMore }
    },
    filters,
    root: gridScrollRef.current,
  })

  const igtfHabilitado = useCarritoStore((s) => s.igtfHabilitado)
  const cantidadItems = useCarritoStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))

  // Totales from store
  const totales = useMemo(() => useCarritoStore.getState().getTotales(), [items, instrumentos, metodoPago])

  const sumaBs = useMemo(
    () => instrumentos
      .filter((i) => i.moneda === 'BS')
      .reduce((acc, i) => acc + parseMonto(i.monto), 0),
    [instrumentos]
  )

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => {})

    obtenerMiEmpresa()
      .then((emp) => {
        if (!emp) return
        useCarritoStore.getState().setTasaBCV(emp.tasa_activa ?? 36.50)
        if (emp.igtf_habilitado != null) {
          useCarritoStore.setState({ igtfHabilitado: emp.igtf_habilitado })
        }
        const enLinea =
          typeof navigator === 'undefined' ? true : navigator.onLine
        if (enLinea) {
          marcarTasaSincronizada()
          setTasaActualizadaEn(new Date().toISOString())
        } else {
          setTasaActualizadaEn(leerTasaSincronizada())
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLIENTES_KEY)
      if (raw) setClientesRecientes(JSON.parse(raw) as string[])
    } catch {}
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        busquedaRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (carritoDrawerOpen) {
          setCarritoDrawerOpen(false)
          return
        }
        if (pantalla === 'pago') {
          setPantalla('venta')
          return
        }
        if (busquedaRef.current && busquedaRef.current.value) {
          setBusqueda('')
        } else {
          resetearTodo()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pantalla, carritoDrawerOpen])

  // Sugerencias: primeros 8 de la lista ya cargada (para vista lista)
  const sugerencias = useMemo(() => productos.slice(0, 8), [productos])

  function agregarAlCarrito(p: ProductoJoin) {
    useCarritoStore.getState().agregarProducto(p)
    setMsg('')
  }

  function resetearTodo() {
    useCarritoStore.getState().limpiarCarrito()
    setPantalla('venta')
    setVentaExitosa(false)
    setMsg('')
    setCarritoDrawerOpen(false)
    setEditingPrice(null)
  }

  function handleMetodoPago(m: MetodoPago) {
    useCarritoStore.getState().setMetodoPago(m)
  }

  async function handleConfirmarVenta() {
    if (items.length === 0 || soloLectura) return

    if (metodoPago === 'credito' && !cedula.trim()) {
      setMsg('Para ventas a credito, ingresa al menos la cedula del cliente.')
      return
    }

    if (metodoPago === 'contado' && instrumentos.length === 0) {
      setMsg('Agrega al menos un instrumento de pago.')
      return
    }

    if (metodoPago === 'contado' && !pagoValido) {
      setMsg('El pago no cubre el total de la venta.')
      return
    }

    setProcesando(true)
    setMsg('')
    try {
      const pagos = instrumentos.map((inst) => {
        const monto = parseFloat(inst.monto) || 0
        const tasa = useCarritoStore.getState().getTasa()
        const montoUsd = inst.moneda === 'USD' ? monto : monto / tasa
        return {
          metodo: inst.tipo,
          moneda: inst.moneda,
          monto: monto.toFixed(2),
          monto_usd: montoUsd.toFixed(2),
          tasa_aplicada: inst.moneda === 'USD' ? '1' : String(tasa),
        }
      })

        await registrarVentaOffline(
          items,
          pagos,
          cliente,
          cedula,
          metodoPago,
          totales.totalUSD,
          totales.totalVES,
          totales.tasa
        )
      if (cliente.trim()) {
        setClientesRecientes((prev) => {
          const next = Array.from(new Set([cliente.trim(), ...prev])).slice(0, 10)
          try {
            localStorage.setItem(CLIENTES_KEY, JSON.stringify(next))
          } catch {}
          return next
        })
      }
      setVentaExitosa(true)
      setCarritoDrawerOpen(false)
      setTimeout(() => resetearTodo(), 3000)
    } catch (err) {
      setMsg(`Error al registrar: ${(err as Error).message}`)
    } finally {
      setProcesando(false)
    }
  }

  const contadoValido = instrumentos.length > 0 && totales.pagoCompleto
  const pagoValido = metodoPago === 'credito' || contadoValido

  // ─── Pantalla 1: Venta (catalogo + carrito) ─────────────────────
  if (pantalla === 'venta') {
    return (
      <div className="pos">
        <div className="pos-grid">
          <section className="pos-productos" aria-label="Productos">
            {soloLectura && (
              <span className="pos-readonly-badge">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                Caja cerrada — solo consulta
              </span>
            )}

            <div className="pos-search-row">
              <label className="pos-busqueda">
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                  ref={busquedaRef}
                  className="buscador"
                  placeholder="Buscar producto por nombre, SKU o codigo…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  aria-label="Buscar producto"
                />
              </label>
              <select
                className="filtro-cat"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                aria-label="Filtrar por categoría"
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <div className="pos-view-toggle" role="group" aria-label="Vista">
                <button
                  className={vista === 'lista' ? 'active' : ''}
                  onClick={() => setVista('lista')}
                  aria-pressed={vista === 'lista'}
                  title="Lista"
                >
                  <span className="material-symbols-outlined">list</span>
                </button>
                <button
                  className={vista === 'grid' ? 'active' : ''}
                  onClick={() => setVista('grid')}
                  aria-pressed={vista === 'grid'}
                  title="Cuadricula"
                >
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
              </div>
            </div>

            {loading ? (
              <p className="pos-vacio">Cargando productos…</p>
            ) : error ? (
              <p className="pos-vacio" style={{ color: '#dc2626' }}>{error}</p>
            ) : vista === 'lista' ? (
              <div className="pos-sugerencias" ref={gridScrollRef}>
                {sugerencias.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="pos-producto-list"
                    disabled={soloLectura}
                    onClick={() => agregarAlCarrito(p)}
                  >
                    <span className="pos-sugerencia-nombre">{p.nombre}</span>
                    <code className="pos-sugerencia-sku">{p.sku ?? '—'}</code>
                    <span className="stock-badge">
                      Stock: {p.stock_actual}
                    </span>
                    <span className="pos-sugerencia-precio">
                      ${Number(p.precio_usd).toFixed(2)}
                    </span>
                    <span className="pos-add-icon" aria-hidden="true">add_circle</span>
                  </button>
                ))}
                {sugerencias.length === 0 && (
                  <p className="pos-vacio">Sin productos que coincidan.</p>
                )}
                <div ref={sentinelRef} className="sentinela" />
              </div>
            ) : (
              <div className="pos-productos-grid" ref={gridScrollRef}>
                {productos.map((p) => {
                  const st = p.stock_actual <= 0 ? 'off' : p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo ? 'warn' : 'ok'
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="card-producto"
                      disabled={soloLectura}
                      onClick={() => agregarAlCarrito(p)}
                      style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    >
                      <div className="card-img">
                        {p.imagen_url ? (
                          <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                        ) : (
                          <span className="thumb-empty material-symbols-outlined">inventory_2</span>
                        )}
                        <span className={`ribbon ${st}`}>
                          {st === 'off' ? 'Agotado' : st === 'warn' ? 'Stock bajo' : 'Disponible'}
                        </span>
                        <span className="pos-card-add" aria-hidden="true">add</span>
                      </div>
                      <div className="card-info">
                        <div className="card-sku"><code>{p.sku ?? '—'}</code></div>
                        <div className="card-nombre">{p.nombre}</div>
                        <div className="card-footer">
                          <div className="card-precio">
                            ${Number(p.precio_usd).toFixed(2)}
                          </div>
                          <div className={`card-stock ${st === 'off' ? 'off' : st === 'warn' ? 'warn' : ''}`}>
                            {p.stock_actual} uds
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {productos.length === 0 && (
                  <p className="pos-vacio">Sin productos que coincidan.</p>
                )}
                <div ref={sentinelRef} className="sentinela" />
              </div>
            )}

            {loadingMore && <p className="loading-more">Cargando más…</p>}
          </section>

          {carritoDrawerOpen && <div className="pos-cart-backdrop" onClick={() => setCarritoDrawerOpen(false)} />}

          <div className={`pos-wizard-panel${carritoDrawerOpen ? ' drawer-open' : ''}`}>
            <div className="pos-wizard-content">
              <div className="carrito-header">
                <button
                  type="button"
                  className="pos-cart-close carrito-close-mobile"
                  onClick={() => setCarritoDrawerOpen(false)}
                  aria-label="Cerrar carrito"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <h3>Carrito</h3>
                {items.length > 0 && (
                  <button
                    type="button"
                    className="carrito-clear"
                    onClick={() => {
                      useCarritoStore.getState().limpiarCarrito()
                      setEditingPrice(null)
                    }}
                    title="Vaciar carrito"
                  >
                    <span className="material-symbols-outlined">delete_sweep</span>
                  </button>
                )}
              </div>
              <Carrito
                items={items}
                onIncrement={(id) => useCarritoStore.getState().incrementarCantidad(id)}
                onDecrement={(id) => useCarritoStore.getState().decrementarCantidad(id)}
                onRemove={(id) => useCarritoStore.getState().eliminarItem(id)}
                tasa={totales.tasa}
                tasaActualizadaEn={tasaActualizadaEn}
                deshabilitado={soloLectura}
                editingPrice={editingPrice}
                onEditPrice={(id) => {
                  setEditingPrice(id)
                }}
                onUpdatePrice={(id, precio) => {
                  useCarritoStore.getState().actualizarPrecioItem(id, precio)
                }}
                onFinishEditPrice={() => setEditingPrice(null)}
              />
              {items.length > 0 && (
                <div className="carrito-ticket-acciones" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={soloLectura}
                    onClick={() => {
                      useCarritoStore.getState().setMetodoPago('contado')
                      setPantalla('pago')
                      setCarritoDrawerOpen(false)
                      setEditingPrice(null)
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                    Cobrar — {fmtUsd(totales.subtotalUSD)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="pos-cart-toggle" onClick={() => setCarritoDrawerOpen(true)}>
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="pos-cart-toggle-btn">
              Ver carrito
            </span>
            <span className="pos-cart-toggle-info">
              {cantidadItems}
            </span>
            <span className="pos-cart-toggle-info">
              {fmtUsd(totales.totalUSD)}
            </span>
          </div>
        )}

        {msg && (
          <p
            style={{
              fontWeight: 600,
              color: msg.startsWith('Error') ? '#dc2626' : '#16a34a',
            }}
          >
            {msg}
          </p>
        )}
      </div>
    )
  }

  // ─── Pantalla 2: Pago consolidado ───────────────────────────────
  return (
    <div className="pos">
      <div className="pos-pago-wrapper">
        <div className="pos-pago">
          {ventaExitosa ? (
            <div className="pos-pago-exito">
              <span className="material-symbols-outlined pos-pago-exito-icon" aria-hidden="true">
                check_circle
              </span>
              <h2 className="pos-pago-exito-titulo">Venta registrada</h2>
              <p className="pos-pago-exito-total">{fmtUsd(totales.subtotalUSD)}</p>
              <p className="pos-pago-exito-total" style={{ fontSize: 'var(--fs-lg)', color: 'var(--text-secondary)', margin: 0 }}>
                {fmtBs(totales.subtotalVES)}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="primary" onClick={resetearTodo}>
                  Nueva venta
                </button>
                <button type="button" className="wf-btn wf-btn-atras" disabled>
                  <span className="material-symbols-outlined" aria-hidden="true">print</span>
                  Imprimir
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="pos-pago-header">
                <button
                  type="button"
                  className="wf-btn wf-btn-atras"
                  onClick={() => setPantalla('venta')}
                  disabled={procesando}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                  Volver
                </button>
                <h2 className="wf-titulo">Cobrar</h2>
              </div>

              {/* Resumen de productos */}
              <div className="pos-pago-seccion">
                <span className="wf-pago-label">Productos</span>
                <div className="wf-resumen-items-header">
                  <span>Item</span>
                  <span>Cant</span>
                  <span>P.Unit</span>
                  <span>Subtotal</span>
                </div>
                {items.map((it) => {
                  const p = it.producto
                  const precio = it.precio_override ?? Number(p.precio_usd)
                  return (
                    <div className="wf-resumen-items-row" key={p.id}>
                      <span className="wf-resumen-item-nombre">{p.nombre}</span>
                      <span className="wf-resumen-item-cant">{it.cantidad}</span>
                      <span className="wf-resumen-item-pu">{fmtUsd(precio)}</span>
                      <span className="wf-resumen-item-sub">
                        {fmtUsd(precio * it.cantidad)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Total general */}
              <div className="wf-resumen-total">
                <strong className="wf-resumen-total-usd">{fmtUsd(totales.subtotalUSD)}</strong>
                <span className="wf-resumen-total-bs">{fmtBs(totales.subtotalVES)}</span>
              </div>

              {/* Datos del cliente (opcional) */}
              <div className="pos-pago-seccion">
                <span className="wf-pago-label">Cliente (opcional)</span>
                <div className="wf-cliente-campo">
                  <label htmlFor="pago-nombre">Nombre</label>
                  <input
                    id="pago-nombre"
                    type="text"
                    list="pago-clientes-list"
                    placeholder="Nombre del cliente"
                    value={cliente}
                    onChange={(e) => useCarritoStore.getState().setCliente(e.target.value)}
                    autoComplete="off"
                  />
                  <datalist id="pago-clientes-list">
                    {clientesRecientes.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="wf-cliente-campo">
                  <label htmlFor="pago-cedula">Cedula / RIF</label>
                  <input
                    id="pago-cedula"
                    type="text"
                    placeholder="V-12345678"
                    value={cedula}
                    onChange={(e) => useCarritoStore.getState().setCedula(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Tipo de pago */}
              <div className="pos-pago-seccion">
                <div className="wf-pago-tipo" role="radiogroup" aria-label="Tipo de pago">
                  <span className="wf-pago-label">Tipo de pago</span>
                  <div className="wf-pago-radios">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={metodoPago === 'contado'}
                      className="wf-pago-radio"
                      onClick={() => handleMetodoPago('contado')}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                      De contado
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={metodoPago === 'credito'}
                      className="wf-pago-radio"
                      onClick={() => handleMetodoPago('credito')}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">person</span>
                      A credito
                    </button>
                  </div>
                </div>
              </div>

              {/* Instrumentos de pago (solo contado) */}
              {metodoPago === 'contado' && (
                <div className="pos-pago-seccion">
                  <span className="wf-pago-label">Instrumentos de pago</span>
                  {instrumentos.map((inst, idx) => {
                    const montoNum = parseMonto(inst.monto)
                    const tasa = totales.tasa
                    const montoUsd = inst.moneda === 'USD' ? montoNum : montoNum / tasa
                    return (
                      <div className="wf-pago-instrumento" key={inst.id}>
                        <div className="wf-pago-instrumento-header">
                          <span className="wf-pago-instrumento-num">#{idx + 1}</span>
                          {instrumentos.length > 1 && (
                            <button
                              type="button"
                              className="wf-pago-instrumento-remove"
                              aria-label="Quitar este pago"
                              onClick={() => useCarritoStore.getState().quitarInstrumento(inst.id)}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">close</span>
                            </button>
                          )}
                        </div>
                        <div className="wf-pago-instrumento-fila">
                          <select
                            className="wf-pago-instrumento-select"
                            value={inst.tipo}
                            onChange={(e) =>
                              useCarritoStore.getState().actualizarInstrumento(inst.id, { tipo: e.target.value as TipoInstrumento })
                            }
                            aria-label="Tipo de pago"
                          >
                            {TIPOS_DISPONIBLES.map((t) => (
                              <option key={t} value={t}>{NOMBRES_TIPO[t]}</option>
                            ))}
                          </select>
                          <select
                            className="wf-pago-instrumento-moneda"
                            value={inst.moneda}
                            onChange={(e) =>
                              useCarritoStore.getState().actualizarInstrumento(inst.id, { moneda: e.target.value as MonedaPago })
                            }
                            aria-label="Moneda"
                          >
                            <option value="USD">USD</option>
                            <option value="BS">Bs</option>
                          </select>
                          <input
                            type="number"
                            className="wf-pago-instrumento-monto"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={inst.monto}
                            onChange={(e) =>
                              useCarritoStore.getState().actualizarInstrumento(inst.id, { monto: e.target.value })
                            }
                            autoFocus={idx === 0}
                            aria-label={`Monto del pago ${idx + 1}`}
                          />
                        </div>
                        {montoNum > 0 && inst.moneda !== 'USD' && (
                          <span className="wf-pago-instrumento-usd">≈ {fmtUsd(montoUsd)}</span>
                        )}
                        {montoNum > 0 && inst.moneda === 'USD' && (
                          <span className="wf-pago-instrumento-bs">≈ {fmtBs(montoNum * totales.tasa)}</span>
                        )}
                      </div>
                    )
                  })}

                  {instrumentos.length < 5 && (
                    <button type="button" className="wf-pago-agregar" onClick={() => useCarritoStore.getState().agregarInstrumento()}>
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                      Agregar pago
                    </button>
                  )}

                  {/* Resumen de pagos */}
                  <div className="pago-resumen">
                    <div className="pago-resumen-linea">
                      <span>Total</span>
                      <strong>{fmtUsd(totales.totalUSD)}</strong>
                    </div>
                    <div className="pago-resumen-linea pago-resumen-asignado">
                      <span>Recibido</span>
                      <strong>{fmtUsd(totales.totalAsignadoUSD)}</strong>
                    </div>
                    {totales.faltante > 0 && (
                      <div className="pago-resumen-linea pago-resumen-faltante">
                        <span>Faltante</span>
                        <strong>{fmtUsd(totales.faltante)}</strong>
                      </div>
                    )}
                    {totales.excedente > 0 && (
                      <div className="pago-resumen-linea pago-resumen-excedente">
                        <span>Vuelto</span>
                        <strong className="vuelto-valor">{fmtUsd(totales.excedente)}</strong>
                        <span className="vuelto-bs">{fmtBs(totales.excedente * totales.tasa)}</span>
                      </div>
                    )}
                    {totales.pagoCompleto && totales.faltante === 0 && (
                      <div className="pago-resumen-linea pago-resumen-completo">
                        <span>Pago exacto</span>
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desglose de impuestos */}
              <div className="pos-pago-seccion">
                <span className="wf-pago-label">Desglose de IVA e IGTF</span>
                <div className="wf-pago-impuestos-grid">
                  <div className="wf-pago-impuesto-fila">
                    <span>Subtotal</span>
                    <span>{fmtUsd(totales.subtotalUSD)}</span>
                  </div>
                  <div className="wf-pago-impuesto-fila">
                    <span>IVA (16%)</span>
                    <span>{fmtUsd(totales.ivaUSD)}</span>
                  </div>
                  {totales.igtfUSD > 0 && (
                    <div className="wf-pago-impuesto-fila">
                      <span>IGTF (3% sobre pago en BS)</span>
                      <span>{fmtUsd(totales.igtfUSD)}</span>
                    </div>
                  )}
                  <div className="wf-pago-impuesto-fila wf-pago-impuesto-total">
                    <span>Total con impuestos</span>
                    <span>{fmtUsd(totales.totalUSD)}</span>
                  </div>
                </div>
                {igtfHabilitado && metodoPago === 'contado' && sumaBs === 0 && (
                  <div className="wf-pago-igtf-hint">
                    <span className="material-symbols-outlined">info</span>
                    IGTF 3% se aplica solo si pagas en BS
                  </div>
                )}
              </div>

              {msg && (
                <p
                  className="pos-pago-msg"
                  style={{ color: msg.startsWith('Error') || msg.startsWith('Para') || msg.startsWith('El pago') || msg.startsWith('Agrega') ? '#dc2626' : '#16a34a' }}
                >
                  {msg}
                </p>
              )}

              {/* Confirmar */}
              <div className="pos-pago-confirmar">
                <button
                  type="button"
                  className="wf-btn wf-btn-confirmar primary"
                  onClick={handleConfirmarVenta}
                  disabled={soloLectura || procesando || !pagoValido}
                >
                  {procesando ? (
                    <>
                      <span className="material-symbols-outlined spinning" aria-hidden="true">progress_activity</span>
                      Registrando venta...
                    </>
                  ) : (
                    'Confirmar venta'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
