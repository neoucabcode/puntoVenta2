import { type HistorialEntry } from '../lib/productos'

type Props = {
  entries: HistorialEntry[]
  onClose: () => void
  loading: boolean
}

const ACCION_COLORS: Record<string, string> = {
  creado: 'ok',
  editado: 'info',
  eliminado: 'off',
  ajuste_stock: 'warn',
}

const ACCION_LABELS: Record<string, string> = {
  creado: 'Creado',
  editado: 'Editado',
  eliminado: 'Eliminado',
  ajuste_stock: 'Ajuste stock',
}

function fmtFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetallesCell({ entry }: { entry: HistorialEntry }) {
  const d = entry.detalles ?? {}
  if (entry.accion === 'editado' && Array.isArray(d.cambios)) {
    return <span>{d.cambios.join(', ')}</span>
  }
  if (entry.accion === 'ajuste_stock') {
    const parts: string[] = []
    if (d.cantidad !== undefined) parts.push(`Cantidad: ${d.cantidad}`)
    if (d.motivo !== undefined) parts.push(`Motivo: ${d.motivo}`)
    return <span>{parts.join(' · ') || '—'}</span>
  }
  return <span>—</span>
}

export function HistorialModal({ entries, onClose, loading }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Historial de cambios</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="form-grid" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: '1.25rem', margin: 0, color: 'var(--text-muted)' }}>Cargando…</p>
          ) : entries.length === 0 ? (
            <p style={{ padding: '1.25rem', margin: 0, color: 'var(--text-muted)' }}>Sin registros.</p>
          ) : (
            <div className="hist-scroll">
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Acción</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="hist-fecha">{fmtFecha(e.creado_en)}</td>
                      <td>{e.producto_nombre}</td>
                      <td>
                        <span className={`hist-badge ${ACCION_COLORS[e.accion] ?? ''}`}>
                          {ACCION_LABELS[e.accion] ?? e.accion}
                        </span>
                      </td>
                      <td className="hist-detalles"><DetallesCell entry={e} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
