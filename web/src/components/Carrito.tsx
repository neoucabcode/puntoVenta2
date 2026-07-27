// Carrito.tsx — panel de carrito estilo ticket/table (presentacional).
//
// Componente 100% controlado: NO posee estado de carrito, tasa ni metodo de pago.
// PosPage es quien guarda el carrito (store) y decide la venta.
// Solo muestra items + total + tasa. Los botones de accion estan en PosPage.

import { tasaEstaDesactualizada } from '../lib/tasaSync'
import type { CarritoItem } from '../types/carrito'
import { fmtUsd, fmtBs } from '../types/carrito'

export type { CarritoItem }
export type { MetodoPago, MonedaPago, TipoInstrumento, InstrumentoPago } from '../types/carrito'
export { fmtUsd, fmtBs, parseMonto, NOMBRES_TIPO, TIPOS_DISPONIBLES, nuevoInstrumento } from '../types/carrito'

interface CarritoProps {
  items: CarritoItem[]
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  onRemove: (id: string) => void
  /** Tasa Bs/$ vigente (1 USD = tasa Bs). */
  tasa: number
  /** ISO de la ultima sincronizacion real de la tasa; null = sin evidencia. */
  tasaActualizadaEn: string | null
  deshabilitado: boolean
  /** ID del item cuyo precio se esta editando inline, o null. */
  editingPrice?: string | null
  /** Callback cuando se hace click en el precio para editarlo. */
  onEditPrice?: (id: string, precio: number) => void
  /** Callback para actualizar el precio override de un item. */
  onUpdatePrice?: (id: string, precio: number) => void
  /** Callback cuando se termina de editar (blur / Escape). */
  onFinishEditPrice?: () => void
}

export function Carrito({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  tasa,
  tasaActualizadaEn,
  deshabilitado: _deshabilitado,
  editingPrice,
  onEditPrice,
  onUpdatePrice,
  onFinishEditPrice,
}: CarritoProps) {
  const totalUsd = items.reduce((acc, it) => {
    const precio = it.precio_override ?? Number(it.producto.precio_usd)
    return acc + (precio - (it.descuento_item || 0)) * it.cantidad
  }, 0)
  const totalBs = totalUsd * tasa
  const desactualizada = tasaEstaDesactualizada(tasaActualizadaEn)
  const vacio = items.length === 0

  return (
    <section className="carrito-ticket" aria-label="Carrito de venta">
      {/* Tasa en una linea compacta */}
      <div className="carrito-ticket-tasa" aria-live="polite">
        <strong>1 USD = {tasa} Bs</strong>
        {desactualizada && (
          <span className="tasa-stale" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">warning</span>
            {' '}desactualizada
          </span>
        )}
      </div>

      {/* Lista de items como tabla */}
      {vacio ? (
        <div className="carrito-ticket-vacio">
          Agrega productos para iniciar la venta
        </div>
      ) : (
        <>
          <div className="carrito-ticket-header">
            <span>Item</span>
            <span>Cant</span>
            <span>P.Unit</span>
            <span>Subtotal</span>
            <span></span>
          </div>
          <div className="carrito-ticket-scroll">
            <div className="carrito-ticket-table">
              {items.map((it) => {
                const p = it.producto
                const agotado = p.stock_actual <= 0
                const efectivo = it.precio_override ?? Number(p.precio_usd)
                const descuento = it.descuento_item || 0
                const subtotal = (efectivo - descuento) * it.cantidad
                const nombre = p.nombre
                const tieneDescuento = it.precio_override != null || descuento > 0
                return (
                  <div className="carrito-ticket-row" key={p.id}>
                    <div className="carrito-ticket-info">
                      <span className="carrito-ticket-nombre" title={nombre}>
                        {nombre}
                        {agotado && <span className="badge off">Agotado</span>}
                      </span>
                      <span className="carrito-ticket-sku">{p.sku ?? '—'}</span>
                    </div>

                    <div
                      className="carrito-ticket-cant"
                      role="group"
                      aria-label={`Cantidad de ${nombre}`}
                    >
                      <button
                        type="button"
                        aria-label={`Quitar uno de ${nombre}`}
                        onClick={() => onDecrement(p.id)}
                        disabled={it.cantidad <= 1}
                      >−</button>
                      <span className="cant-num" aria-live="polite">
                        {it.cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Agregar uno de ${nombre}`}
                        onClick={() => onIncrement(p.id)}
                      >+</button>
                    </div>

                    <div className="carrito-ticket-pu">
                      {editingPrice === p.id ? (
                        <input
                          type="number"
                          className="carrito-price-edit"
                          defaultValue={Number(efectivo)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val >= 0 && onUpdatePrice) {
                              onUpdatePrice(p.id, val)
                            }
                            onFinishEditPrice?.()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              onFinishEditPrice?.()
                            }
                            if (e.key === 'Enter') {
                              const val = parseFloat((e.target as HTMLInputElement).value)
                              if (!isNaN(val) && val >= 0 && onUpdatePrice) {
                                onUpdatePrice(p.id, val)
                              }
                              onFinishEditPrice?.()
                            }
                          }}
                          autoFocus
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        <span
                          className="carrito-ticket-pu-value"
                          onClick={() => onEditPrice?.(p.id, Number(efectivo))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onEditPrice?.(p.id, Number(efectivo))
                            }
                          }}
                        >
                          {tieneDescuento ? (
                            <>
                              <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.7rem' }}>
                                {fmtUsd(Number(p.precio_usd))}
                              </span>
                              {' '}
                              {fmtUsd(efectivo)}
                            </>
                          ) : (
                            fmtUsd(efectivo)
                          )}
                          {it.precio_override != null && (
                            <span className="price-overridden">editado</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="carrito-ticket-sub">
                      {descuento > 0 ? (
                        <>
                          <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.7rem' }}>
                            {fmtUsd(efectivo * it.cantidad)}
                          </span>
                          {' '}
                          {fmtUsd(subtotal)}
                        </>
                      ) : (
                        fmtUsd(subtotal)
                      )}
                    </div>

                    <button
                      type="button"
                      className="carrito-ticket-remove"
                      aria-label={`Quitar ${nombre} del carrito`}
                      onClick={() => onRemove(p.id)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total */}
          <div className="carrito-ticket-total">
            <strong className="carrito-ticket-total-usd">{fmtUsd(totalUsd)}</strong>
            <span className="carrito-ticket-total-bs">{fmtBs(totalBs)}</span>
          </div>
        </>
      )}
    </section>
  )
}
