import { useEffect, useState } from 'react'
import { listarProductos, type ProductoJoin } from '../lib/productos'
import { registrarVentaOffline } from '../lib/ventaOffline'
import { useCajaStore } from '../store/useCajaStore'

// Pantalla de venta (V1 mínimo): registra la venta offline-first en la cola
// IndexedDB en lugar de insert directo (REQ-3/REQ-4). En modo solo-lectura
// (caja habilitada sin caja abierta, REQ-2) la acción queda deshabilitada.
export function PosPage() {
  const cajaAbierta = useCajaStore((s) => s.cajaAbierta)
  const cajaHabilitada = useCajaStore((s) => s.cajaHabilitada)
  const soloLectura = cajaHabilitada && !cajaAbierta
  const [productos, setProductos] = useState<ProductoJoin[]>([])
  const [selId, setSelId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [msg, setMsg] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    listarProductos({ soloActivos: true, offset: 0, pageSize: 200 })
      .then((r) => setProductos(r.items))
      .catch(() => setProductos([]))
  }, [])

  const sel = productos.find((p) => p.id === selId) ?? null

  async function onVender() {
    if (!sel) return
    setProcesando(true)
    setMsg('')
    try {
      await registrarVentaOffline(sel, cantidad)
      setMsg(`Venta registrada (pendiente de sincronizar): ${sel.nombre} x${cantidad}`)
      setSelId('')
      setCantidad(1)
    } catch (err) {
      setMsg(`Error al registrar la venta: ${(err as Error).message}`)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="pos">
      <h1>Venta</h1>
      {soloLectura && (
        <p className="error">
          La caja no está abierta en este dispositivo. Abre caja para poder vender (modo solo consulta).
        </p>
      )}
      <div className="pos-form">
        <label>
          Producto
          <select value={selId} onChange={(e) => setSelId(e.target.value)}>
            <option value="">Selecciona…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — ${Number(p.precio_usd).toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cantidad
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <button className="primary" disabled={!sel || soloLectura || procesando} onClick={onVender}>
          Registrar venta
        </button>
      </div>
      {msg && (
        <p style={{ fontWeight: 600, color: msg.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{msg}</p>
      )}
    </div>
  )
}
