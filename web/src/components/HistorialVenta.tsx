import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { obtenerMiEmpresaId } from '../lib/empresa'

type VentaHoy = {
  id: string
  total_usd: number
  estado: string
  creado_en: string
  pago: { metodo: string; moneda: string; monto: number }[] | null
}

function fmtHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function fmtMonto(n: number): string {
  return `$${n.toFixed(2)}`
}

export function HistorialVenta() {
  const [ventas, setVentas] = useState<VentaHoy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const empresaId = await obtenerMiEmpresaId()
        if (!empresaId || !supabase) {
          setVentas([])
          return
        }
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const { data, error: err } = await supabase
          .from('venta')
          .select('id, total_usd, estado, creado_en, pago(metodo, moneda, monto)')
          .eq('empresa_id', empresaId)
          .gte('creado_en', startOfDay.toISOString())
          .order('creado_en', { ascending: false })
          .limit(20)
        if (err) throw err
        if (!cancelled) setVentas((data ?? []) as VentaHoy[])
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="historial-venta">
      <div className="historial-venta-header">
        <span className="material-symbols-outlined">receipt_long</span>
        <span>Ventas de hoy</span>
      </div>
      {loading && <p className="historial-venta-status">Cargando…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && ventas.length === 0 && (
        <p className="historial-venta-status">Sin ventas registradas hoy</p>
      )}
      {ventas.map((v) => (
        <div key={v.id} className="historial-venta-row">
          <div className="historial-venta-time">{fmtHora(v.creado_en)}</div>
          <div className="historial-venta-info">
            <span className="historial-venta-total">{fmtMonto(v.total_usd)}</span>
            {v.pago && v.pago.length > 0 && (
              <span className="historial-venta-pago">
                {v.pago.map((p) => `${p.moneda} ${fmtMonto(p.monto)}`).join(' / ')}
              </span>
            )}
          </div>
          <span className={`historial-venta-estado badge ${v.estado === 'completada' ? 'ok' : v.estado === 'anulada' ? 'off' : ''}`}>
            {v.estado}
          </span>
        </div>
      ))}
    </div>
  )
}
