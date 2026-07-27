import { useState, useEffect } from 'react'
import * as cola from '../lib/colaOffline'
import { getDeviceId } from '../lib/caja'
import { useCajaStore } from '../store/useCajaStore'

export function SyncStatus() {
  const pendientes = useCajaStore((s) => s.pendientes)
  const online = useCajaStore((s) => s.online)
  const [errores, setErrores] = useState(0)
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const [reintentando, setReintentando] = useState(false)

  useEffect(() => {
    cola.contarErrores(getDeviceId()).then(setErrores).catch(() => {})
  }, [pendientes])

  if (pendientes === 0 && errores === 0) return null

  return (
    <div className="sync-status">
      <button
        className="sync-status-toggle"
        onClick={() => setMostrarDetalle(!mostrarDetalle)}
        title="Estado de sincronización"
      >
        <span className={`sync-dot ${online ? 'on' : 'off'}`} />
        {pendientes > 0 && (
          <span className="sync-badge">{pendientes}</span>
        )}
        {errores > 0 && (
          <span className="sync-error-badge">{errores} error{errores === 1 ? '' : 'es'}</span>
        )}
      </button>

      {mostrarDetalle && (
        <div className="sync-detail">
          <div className="sync-detail-header">
            <span>Sincronización</span>
            <button onClick={() => setMostrarDetalle(false)} aria-label="Cerrar detalle de sincronización">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="sync-detail-body">
            <p>
              <span className={`sync-dot ${online ? 'on' : 'off'}`} />
              {online ? 'En línea' : 'Sin conexión'}
            </p>
            {pendientes > 0 && (
              <p>{pendientes} venta{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'}</p>
            )}
            {errores > 0 && (
              <p className="sync-error-text">
                {errores} venta{errores === 1 ? '' : 's'} con error
              </p>
            )}
            {errores > 0 && (
              <button
                className="sync-retry-btn"
                disabled={reintentando}
                onClick={async () => {
                  setReintentando(true)
                  try {
                    await cola.reintentarErrores(getDeviceId())
                    useCajaStore.getState().refrescar()
                    setErrores(0)
                  } finally {
                    setReintentando(false)
                  }
                }}
              >
                <span className="material-symbols-outlined">refresh</span>
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
