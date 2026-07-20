import { useEffect, useMemo, useState } from 'react'
import { listarProductos, type ProductoJoin } from '../lib/productos'
import { obtenerMiEmpresa } from '../lib/empresa'
import { registrarVentaOffline } from '../lib/ventaOffline'
import { useCajaStore } from '../store/useCajaStore'
import { Carrito, type CarritoItem, type MetodoPago } from '../components/Carrito'
import {
  marcarTasaSincronizada,
  leerTasaSincronizada,
} from '../lib/tasaSync'

// Pantalla de venta (refresh estilo Fina, Slice 2). El carrito vive en estado
// local de este componente (NO en useCajaStore, que queda intacto). La venta se
// sigue registrando con `registrarVentaOffline` ítem por ítem, produciendo el
// MISMO evento en `ventas_pendientes` que antes del refresh: el contrato
// offline (cola/autoSync) no cambia.

const CLIENTES_KEY = 'pv-clientes-recientes'

export function PosPage() {
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const soloLectura = cajaHabilitada && !cajaAbierta

  const [productos, setProductos] = useState<ProductoJoin[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [tasa, setTasa] = useState(1)
  const [tasaActualizadaEn, setTasaActualizadaEn] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('contado')
  const [cliente, setCliente] = useState('')
  const [clientesRecientes, setClientesRecientes] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Catálogo + tasa de la empresa al montar.
  useEffect(() => {
    listarProductos({ soloActivos: true, offset: 0, pageSize: 200 })
      .then((r) => setProductos(r.items))
      .catch(() => setProductos([]))

    obtenerMiEmpresa()
      .then((emp) => {
        if (!emp) return
        setTasa(emp.tasa_activa ?? 1)
        // Solo refrescamos el sello de "sincronizada" si venimos de una fuente
        // en línea; si estamos offline conservamos la última conocida para poder
        // marcarla como desactualizada si pasó >24h.
        const enLinea =
          typeof navigator === 'undefined' ? true : navigator.onLine
        if (enLinea) {
          marcarTasaSincronizada()
          setTasaActualizadaEn(new Date().toISOString())
        } else {
          setTasaActualizadaEn(leerTasaSincronizada())
        }
      })
      .catch(() => {
        /* offline-safe: la tasa queda en 1 y sin sello */
      })
  }, [])

  // Clientes recientes (presentacional, persistidos localmente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLIENTES_KEY)
      if (raw) setClientesRecientes(JSON.parse(raw) as string[])
    } catch {
      /* ignora formato inválido */
    }
  }, [])

  const sugerencias = useMemo(
    () =>
      productos
        .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        .slice(0, 8),
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

  async function confirmar() {
    if (carrito.length === 0 || soloLectura) return
    setProcesando(true)
    setMsg('')
    try {
      // Ventas idénticas a las del flujo anterior: un evento por ítem vía
      // registrarVentaOffline (cola offline intacta).
      for (const it of carrito) {
        await registrarVentaOffline(it.producto, it.cantidad)
      }
      // Recuerda el cliente para próximas ventas (presentacional).
      if (cliente.trim()) {
        setClientesRecientes((prev) => {
          const next = Array.from(new Set([cliente.trim(), ...prev])).slice(0, 10)
          try {
            localStorage.setItem(CLIENTES_KEY, JSON.stringify(next))
          } catch {
            /* ignora */
          }
          return next
        })
      }
      const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
      setMsg(`Venta registrada (pendiente de sincronizar): ${totalItems} ítems`)
      setCarrito([])
      setCliente('')
    } catch (err) {
      setMsg(`Error al registrar la venta: ${(err as Error).message}`)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="pos">
      <div className="pos-grid">
        <section className="pos-productos" aria-label="Productos">
          <h1>Venta</h1>
          {soloLectura && (
            <p className="error">
              La caja no está abierta en este dispositivo. Abre caja para poder
              vender (modo solo consulta).
            </p>
          )}

          <label className="pos-busqueda">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              className="buscador"
              placeholder="Buscar producto por nombre, SKU o código…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar producto"
            />
          </label>

          <div className="pos-sugerencias">
            {sugerencias.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pos-sugerencia"
                disabled={soloLectura}
                onClick={() => agregarAlCarrito(p)}
              >
                <span className="pos-sugerencia-nombre">{p.nombre}</span>
                <code className="pos-sugerencia-sku">{p.sku ?? '—'}</code>
                <span className="pos-sugerencia-precio num-tab">
                  ${Number(p.precio_usd).toFixed(2)}
                </span>
                {p.stock_actual <= 0 && (
                  <span className="badge off">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      block
                    </span>
                    Agotado
                  </span>
                )}
              </button>
            ))}
            {sugerencias.length === 0 && (
              <p className="pos-vacio">Sin productos que coincidan.</p>
            )}
          </div>
        </section>

        <Carrito
          items={carrito}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={remove}
          tasa={tasa}
          tasaActualizadaEn={tasaActualizadaEn}
          metodoPago={metodoPago}
          onMetodoPago={setMetodoPago}
          cliente={cliente}
          onCliente={setCliente}
          clientesRecientes={clientesRecientes}
          onConfirmar={confirmar}
          onAtras={() => {
            setCarrito([])
            setMsg('')
          }}
          deshabilitado={soloLectura}
          procesando={procesando}
        />
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
