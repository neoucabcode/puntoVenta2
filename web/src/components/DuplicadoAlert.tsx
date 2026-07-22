import { useEffect } from 'react'

type SimilarItem = {
  nombre: string
  sku: string
  similitud: number
}

type Props = {
  similares: SimilarItem[]
  onConfirm: () => void
  onCancel: () => void
}

export function DuplicadoAlert({ similares, onConfirm, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Producto duplicado</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar">×</button>
        </header>
        <div className="form-grid">
          <div className="span-2 duplicado-alert-step">
            <span className="material-symbols-outlined">warning</span>
            <p>Se encontró un producto similar:</p>
          </div>
          <div className="span-2 duplicado-list">
            {similares.map((item, i) => (
              <div key={i} className="duplicado-item">
                <span className="duplicado-item-nombre">{item.nombre}</span>
                <span className="duplicado-item-sku">{item.sku}</span>
                <span className="badge warn">{Math.round(item.similitud * 100)}%</span>
              </div>
            ))}
          </div>
          <footer className="span-2 modal-footer">
            <button type="button" onClick={onCancel}>Cancelar</button>
            <button type="button" className="primary" onClick={onConfirm}>
              Continuar
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
