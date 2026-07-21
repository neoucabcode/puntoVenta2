// Carrito.tsx — panel de carrito estilo ticket/table (presentacional).
//
// Componente 100% controlado: NO posee estado de carrito, tasa ni metodo de pago.
// PosPage es quien guarda el carrito (useState) y decide la venta.
// Solo muestra items + total + tasa. Los botones de accion estan en PosPage.

import type { ProductoJoin } from '../lib/productos'
import { tasaEstaDesactualizada } from '../lib/tasaSync'

export interface CarritoItem {
  producto: ProductoJoin
  cantidad: number
}

export type MetodoPago = 'contado' | 'credito'
export type MonedaPago = 'BS' | 'USD'
export type TipoInstrumento = 'efectivo' | 'transferencia' | 'pago_movil' | 'zelle'

export interface InstrumentoPago {
  id: string
  tipo: TipoInstrumento
  moneda: MonedaPago
  monto: string
}

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
}

export const fmtUsd = (n: number) => `$${n.toFixed(2)}`
export const fmtBs = (n: number) => `Bs ${n.toFixed(2)}`

export const parseMonto = (v: string): number => {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export const NOMBRES_TIPO: Record<TipoInstrumento, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  pago_movil: 'Pago Movil',
  zelle: 'Zelle',
}

export const TIPOS_DISPONIBLES: TipoInstrumento[] = [
  'efectivo',
  'transferencia',
  'pago_movil',
  'zelle',
]

let instCounter = 0
export function nuevoInstrumento(): InstrumentoPago {
  instCounter += 1
  return { id: `inst-${instCounter}`, tipo: 'efectivo', moneda: 'USD', monto: '' }
}

export function Carrito({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  tasa,
  tasaActualizadaEn,
  deshabilitado: _deshabilitado,
}: CarritoProps) {
  const totalUsd = items.reduce(
    (acc, it) => acc + Number(it.producto.precio_usd) * it.cantidad,
    0
  )
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
                const subtotal = Number(p.precio_usd) * it.cantidad
                const nombre = p.nombre
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

                    <div className="carrito-ticket-pu">{fmtUsd(Number(p.precio_usd))}</div>

                    <div className="carrito-ticket-sub">{fmtUsd(subtotal)}</div>

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
