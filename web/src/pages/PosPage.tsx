import { useEffect, useMemo, useRef, useState } from 'react'
import { listarProductos, type ProductoJoin } from '../lib/productos'
import { obtenerMiEmpresa } from '../lib/empresa'
import { registrarVentaOffline } from '../lib/ventaOffline'
import { useCajaStore } from '../store/useCajaStore'
import { Carrito, fmtUsd, fmtBs, nuevoInstrumento, parseMonto, NOMBRES_TIPO, TIPOS_DISPONIBLES, type CarritoItem, type MetodoPago, type InstrumentoPago, type TipoInstrumento, type MonedaPago } from '../components/Carrito'
import {
  marcarTasaSincronizada,
  leerTasaSincronizada,
} from '../lib/tasaSync'

const CLIENTES_KEY = 'pv-clientes-recientes'
const MAX_PRODUCTOS = 9999

type VistaProductos = 'lista' | 'grid'
type Pantalla = 'venta' | 'pago'

export function PosPage() {
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const soloLectura = cajaHabilitada && !cajaAbierta

  const [productos, setProductos] = useState<ProductoJoin[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<VistaProductos>('lista')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [tasa, setTasa] = useState(1)
  const [tasaActualizadaEn, setTasaActualizadaEn] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('contado')
  const [cliente, setCliente] = useState('')
  const [cedula, setCedula] = useState('')
  const [clientesRecientes, setClientesRecientes] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [instrumentos, setInstrumentos] = useState<InstrumentoPago[]>([])
  const [pantalla, setPantalla] = useState<Pantalla>('venta')
  const [ventaExitosa, setVentaExitosa] = useState(false)

  const busquedaRef = useRef<HTMLInputElement>(null)

  const totalUsd = useMemo(
    () => carrito.reduce((acc, it) => acc + Number(it.producto.precio_usd) * it.cantidad, 0),
    [carrito]
  )
  const totalBs = totalUsd * tasa

  useEffect(() => {
    listarProductos({ soloActivos: true, offset: 0, pageSize: MAX_PRODUCTOS })
      .then((r) => setProductos(r.items))
      .catch(() => setProductos([]))

    obtenerMiEmpresa()
      .then((emp) => {
        if (!emp) return
        setTasa(emp.tasa_activa ?? 1)
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
  }, [pantalla])

  const sugerencias = useMemo(
    () =>
      productos
        .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        .slice(0, 8),
    [productos, busqueda]
  )

  const productosFiltrados = useMemo(
    () =>
      busqueda
        ? productos.filter((p) =>
            p.nombre.toLowerCase().includes(busqueda.toLowerCase())
          )
        : productos,
    [productos, busqueda]
  )

  function agregarAlCarrito(p: ProductoJoin) {
    setCarrito((prev) => {
      const found = prev.find((i) => i.producto.id === p.id)
      if (found) {
        return prev.map((i) =>
          i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { producto: p, cantidad: 1 }]
    })
    setMsg('')
  }

  const increment = (id: string) =>
    setCarrito((prev) =>
      prev.map((i) =>
        i.producto.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
      )
    )
  const decrement = (id: string) =>
    setCarrito((prev) =>
      prev.map((i) =>
        i.producto.id === id
          ? { ...i, cantidad: Math.max(1, i.cantidad - 1) }
          : i
      )
    )
  const remove = (id: string) =>
    setCarrito((prev) => prev.filter((i) => i.producto.id !== id))

  function resetearTodo() {
    setCarrito([])
    setCliente('')
    setCedula('')
    setInstrumentos([])
    setMetodoPago('contado')
    setPantalla('venta')
    setVentaExitosa(false)
    setMsg('')
  }

  function handleMetodoPago(m: MetodoPago) {
    setMetodoPago(m)
    if (m === 'contado') {
      setInstrumentos((prev) => prev.length === 0 ? [nuevoInstrumento()] : prev)
    }
  }

  async function handleConfirmarVenta() {
    if (carrito.length === 0 || soloLectura) return

    if (metodoPago === 'credito' && !cedula.trim()) {
      setMsg('Para ventas a credito, ingresa al menos la cedula del cliente.')
      return
    }

    setProcesando(true)
    setMsg('')
    try {
      const pagos = instrumentos.map((inst) => {
        const monto = parseFloat(inst.monto) || 0
        const montoUsd = inst.moneda === 'USD' ? monto : monto / tasa
        return {
          metodo: inst.tipo,
          moneda: inst.moneda,
          monto: monto.toFixed(2),
          monto_usd: montoUsd.toFixed(2),
          tasa_aplicada: inst.moneda === 'USD' ? '1' : String(tasa),
        }
      })

      for (const it of carrito) {
        await registrarVentaOffline(it.producto, it.cantidad, pagos)
      }
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
      setTimeout(() => resetearTodo(), 2000)
    } catch (err) {
      setMsg(`Error al registrar la venta: ${(err as Error).message}`)
    } finally {
      setProcesando(false)
    }
  }

  // ─── Desglose impuestos ─────────────────────────────────────────
  const subtotal = totalUsd
  const iva = subtotal * 0.16
  const sumaBs = instrumentos
    .filter((i) => i.moneda === 'BS')
    .reduce((acc, i) => acc + parseMonto(i.monto), 0)
  const igtfUsd = (sumaBs / tasa) * 0.03
  const totalConImpuestos = subtotal + iva + igtfUsd

  // Instrumentos: validacion de pago
  const totalAsignadoUsd = instrumentos.reduce((acc, inst) => {
    const monto = parseMonto(inst.monto)
    return acc + (inst.moneda === 'USD' ? monto : monto / tasa)
  }, 0)
  const pagoCompleto = totalAsignadoUsd >= totalUsd
  const faltante = Math.max(0, totalUsd - totalAsignadoUsd)
  const excedente = Math.max(0, totalAsignadoUsd - totalUsd)
  const contadoValido = instrumentos.length > 0 && pagoCompleto
  const pagoValido = metodoPago === 'credito' || contadoValido

  function actualizarInst(id: string, cambio: Partial<InstrumentoPago>) {
    setInstrumentos((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...cambio } : i))
    )
  }

  const MAX_INSTRUMENTOS = 5
  function agregarInstrumento() {
    if (instrumentos.length >= MAX_INSTRUMENTOS) return
    setInstrumentos((prev) => [...prev, nuevoInstrumento()])
  }
  function quitarInstrumento(id: string) {
    setInstrumentos((prev) => prev.filter((i) => i.id !== id))
  }

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

            {vista === 'lista' ? (
              <div className="pos-sugerencias">
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
              </div>
            ) : (
              <div className="pos-productos-grid">
                {productosFiltrados.map((p) => {
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
                          <span className="thumb-empty material-symbols-outlined">image</span>
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
                {productosFiltrados.length === 0 && (
                  <p className="pos-vacio">Sin productos que coincidan.</p>
                )}
              </div>
            )}
          </section>

          <div className="pos-wizard-panel">
            <div className="pos-wizard-content">
              <Carrito
                items={carrito}
                onIncrement={increment}
                onDecrement={decrement}
                onRemove={remove}
                tasa={tasa}
                tasaActualizadaEn={tasaActualizadaEn}
                deshabilitado={soloLectura}
              />
              {carrito.length > 0 && (
                <div className="carrito-ticket-acciones" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={soloLectura}
                    onClick={() => {
                      setInstrumentos((prev) => prev.length === 0 ? [nuevoInstrumento()] : prev)
                      setPantalla('pago')
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                    Cobrar — {fmtUsd(totalUsd)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
              <p className="pos-pago-exito-total">{fmtUsd(totalUsd)}</p>
              <button type="button" className="primary" onClick={resetearTodo}>
                Nueva venta
              </button>
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
                {carrito.map((it) => {
                  const p = it.producto
                  const precio = Number(p.precio_usd)
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
                <strong className="wf-resumen-total-usd">{fmtUsd(totalUsd)}</strong>
                <span className="wf-resumen-total-bs">{fmtBs(totalBs)}</span>
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
                    onChange={(e) => setCliente(e.target.value)}
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
                    onChange={(e) => setCedula(e.target.value)}
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
                              onClick={() => quitarInstrumento(inst.id)}
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
                              actualizarInst(inst.id, { tipo: e.target.value as TipoInstrumento })
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
                              actualizarInst(inst.id, { moneda: e.target.value as MonedaPago })
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
                              actualizarInst(inst.id, { monto: e.target.value })
                            }
                            autoFocus={idx === 0}
                            aria-label={`Monto del pago ${idx + 1}`}
                          />
                        </div>
                        {montoNum > 0 && inst.moneda !== 'USD' && (
                          <span className="wf-pago-instrumento-usd">≈ {fmtUsd(montoUsd)}</span>
                        )}
                        {montoNum > 0 && inst.moneda === 'USD' && (
                          <span className="wf-pago-instrumento-bs">≈ {fmtBs(montoNum * tasa)}</span>
                        )}
                      </div>
                    )
                  })}

                  {instrumentos.length < MAX_INSTRUMENTOS && (
                    <button type="button" className="wf-pago-agregar" onClick={agregarInstrumento}>
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                      Agregar pago
                    </button>
                  )}

                  {/* Resumen de pagos */}
                  <div className="pago-resumen">
                    <div className="pago-resumen-linea">
                      <span>Total</span>
                      <strong>{fmtUsd(totalUsd)}</strong>
                    </div>
                    <div className="pago-resumen-linea pago-resumen-asignado">
                      <span>Recibido</span>
                      <strong>{fmtUsd(totalAsignadoUsd)}</strong>
                    </div>
                    {faltante > 0 && (
                      <div className="pago-resumen-linea pago-resumen-faltante">
                        <span>Faltante</span>
                        <strong>{fmtUsd(faltante)}</strong>
                      </div>
                    )}
                    {excedente > 0 && (
                      <div className="pago-resumen-linea pago-resumen-excedente">
                        <span>Vuelto</span>
                        <strong className="vuelto-valor">{fmtUsd(excedente)}</strong>
                        <span className="vuelto-bs">{fmtBs(excedente * tasa)}</span>
                      </div>
                    )}
                    {pagoCompleto && faltante === 0 && (
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
                    <span>{fmtUsd(subtotal)}</span>
                  </div>
                  <div className="wf-pago-impuesto-fila">
                    <span>IVA (16%)</span>
                    <span>{fmtUsd(iva)}</span>
                  </div>
                  <div className="wf-pago-impuesto-fila">
                    <span>IGTF (3% sobre pagos en BS)</span>
                    <span>{fmtUsd(igtfUsd)}</span>
                  </div>
                  <div className="wf-pago-impuesto-fila wf-pago-impuesto-total">
                    <span>Total con impuestos</span>
                    <span>{fmtUsd(totalConImpuestos)}</span>
                  </div>
                </div>
              </div>

              {msg && (
                <p
                  className="pos-pago-msg"
                  style={{ color: msg.startsWith('Error') || msg.startsWith('Para') ? '#dc2626' : '#16a34a' }}
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
                  {procesando ? 'Procesando...' : 'Confirmar venta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
