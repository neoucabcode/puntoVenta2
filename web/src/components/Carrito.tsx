// Carrito.tsx — panel de carrito estilo Fina (Slice 2, presentacional).
//
// Componente 100% controlado: NO posee estado de carrito, tasa ni método de pago.
// PosPage es quien guarda el carrito (useState) y decide la venta; aquí solo se
// dibuja y se emite mediante callbacks. Así el contrato offline (useCajaStore /
// cola / autoSync) queda intacto: este componente no escribe en la cola.
//
// Fidelidad Fina: tarjeta de ítem con SKU, nombre, cantidad +/−, subtotal y
// badge "Agotado"; panel con tasa Bs/$ visible (y aviso si >24h), métodos de
// pago explícitos (De contado / A crédito), selector de cliente, total + equivalente
// en la otra divisa, y botones Atrás / Confirmar.

import type { ProductoJoin } from '../lib/productos'
import { tasaEstaDesactualizada } from '../lib/tasaSync'

export interface CarritoItem {
  producto: ProductoJoin
  cantidad: number
}

export type MetodoPago = 'contado' | 'credito'

interface CarritoProps {
  items: CarritoItem[]
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  onRemove: (id: string) => void
  /** Tasa Bs/$ vigente (1 USD = tasa Bs). */
  tasa: number
  /** ISO de la última sincronización real de la tasa; null = sin evidencia. */
  tasaActualizadaEn: string | null
  metodoPago: MetodoPago
  onMetodoPago: (m: MetodoPago) => void
  cliente: string
  onCliente: (c: string) => void
  clientesRecientes: string[]
  onConfirmar: () => void
  onAtras: () => void
  deshabilitado: boolean
  procesando: boolean
}

const fmtUsd = (n: number) => `$${n.toFixed(2)}`
const fmtBs = (n: number) => `Bs ${n.toFixed(2)}`

export function Carrito({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  tasa,
  tasaActualizadaEn,
  metodoPago,
  onMetodoPago,
  cliente,
  onCliente,
  clientesRecientes,
  onConfirmar,
  onAtras,
  deshabilitado,
  procesando,
}: CarritoProps) {
  const totalUsd = items.reduce(
    (acc, it) => acc + Number(it.producto.precio_usd) * it.cantidad,
    0
  )
  const totalBs = totalUsd * tasa
  const desactualizada = tasaEstaDesactualizada(tasaActualizadaEn)
  const vacio = items.length === 0

  return (
    <section className="carrito" aria-label="Carrito de venta">
      {/* Tasa Bs/$ con aviso de desactualización */}
      <div className="carrito-tasa" aria-live="polite">
        <span className="carrito-tasa-label">Tasa de cambio</span>
        <span className="carrito-tasa-valor num-tab">1 USD = {tasa} Bs</span>
        {desactualizada && (
          <span className="badge warn carrito-tasa-stale" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">
              warning
            </span>
            Puede estar desactualizada
          </span>
        )}
      </div>

      {/* Lista de ítems */}
      {vacio ? (
        <div className="carrito-vacio">
          <span className="material-symbols-outlined" aria-hidden="true">
            point_of_sale
          </span>
          <p>Tu carrito está vacío. Agrega productos desde la izquierda.</p>
        </div>
      ) : (
        <div className="carrito-lista">
          {items.map((it) => {
            const p = it.producto
            const agotado = p.stock_actual <= 0
            const subtotal = Number(p.precio_usd) * it.cantidad
            const nombre = p.nombre
            return (
              <div className="carrito-item" key={p.id}>
                <div className="carrito-item-info">
                  <code className="carrito-item-sku">{p.sku ?? '—'}</code>
                  <span className="carrito-item-nombre" title={nombre}>
                    {nombre}
                  </span>
                  {agotado && (
                    <span className="badge off">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        block
                      </span>
                      Agotado
                    </span>
                  )}
                </div>

                <div
                  className="carrito-item-cant"
                  role="group"
                  aria-label={`Cantidad de ${nombre}`}
                >
                  <button
                    type="button"
                    aria-label={`Quitar uno de ${nombre}`}
                    onClick={() => onDecrement(p.id)}
                    disabled={it.cantidad <= 1}
                  >
                    −
                  </button>
                  <span className="num-tab" aria-live="polite">
                    {it.cantidad}
                  </span>
                  <button
                    type="button"
                    aria-label={`Agregar uno de ${nombre}`}
                    onClick={() => onIncrement(p.id)}
                  >
                    +
                  </button>
                </div>

                <div className="carrito-item-sub num-tab">{fmtUsd(subtotal)}</div>

                <button
                  type="button"
                  className="carrito-item-remove"
                  aria-label={`Quitar ${nombre} del carrito`}
                  onClick={() => onRemove(p.id)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    delete
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Métodos de pago explícitos */}
      <div
        className="carrito-metodos"
        role="radiogroup"
        aria-label="Método de pago"
      >
        <button
          type="button"
          role="radio"
          aria-checked={metodoPago === 'contado'}
          className="carrito-metodo"
          onClick={() => onMetodoPago('contado')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            payments
          </span>
          De contado
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={metodoPago === 'credito'}
          className="carrito-metodo"
          onClick={() => onMetodoPago('credito')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            person
          </span>
          A crédito
        </button>
      </div>

      {/* Cliente (presentacional; la asociación a CXC llega en Slice 3) */}
      <label className="carrito-cliente">
        <span>Cliente</span>
        <input
          type="text"
          list="carrito-clientes-recientes"
          placeholder="Nombre del cliente (opcional)"
          value={cliente}
          onChange={(e) => onCliente(e.target.value)}
          autoComplete="off"
        />
        <datalist id="carrito-clientes-recientes">
          {clientesRecientes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      {/* Total + equivalente en la otra divisa */}
      <div className="carrito-total">
        <div className="carrito-total-col">
          <span className="carrito-total-label">Total</span>
          <strong className="carrito-total-valor num-tab">{fmtUsd(totalUsd)}</strong>
        </div>
        <span className="carrito-total-bs num-tab">{fmtBs(totalBs)}</span>
      </div>

      {/* Acciones */}
      <div className="carrito-acciones">
        <button
          type="button"
          className="caja-btn"
          onClick={onAtras}
          disabled={procesando}
        >
          Atrás
        </button>
        <button
          type="button"
          className="primary"
          onClick={onConfirmar}
          disabled={deshabilitado || procesando || vacio}
        >
          {procesando ? 'Procesando…' : 'Confirmar'}
        </button>
      </div>
    </section>
  )
}
