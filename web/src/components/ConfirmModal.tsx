import { useEffect } from 'react'

type Props = {
  titulo: string
  mensaje: string
  textoConfirmar?: string
  onConfirm: () => void
  onCancel: () => void
  variante?: 'peligro' | 'advertencia'
}

export function ConfirmModal({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  onConfirm,
  onCancel,
  variante = 'advertencia',
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const confirmBg = variante === 'peligro' ? 'var(--off)' : 'var(--accent)'

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{titulo}</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar">×</button>
        </header>
        <div className="form-grid">
          <div className="span-2">
            <p>{mensaje}</p>
          </div>
          <footer className="span-2 modal-footer">
            <button type="button" onClick={onCancel}>Cancelar</button>
            <button
              type="button"
              className="primary"
              onClick={onConfirm}
              style={{ background: confirmBg, color: '#fff' }}
            >
              {textoConfirmar}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
