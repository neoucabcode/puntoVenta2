import { useState, useEffect, useRef } from 'react'

type Props = {
  productoNombre: string
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}

export function ConfirmarEliminarModal({ productoNombre, onConfirm, onCancel, saving }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typedName, setTypedName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const enabled = typedName === productoNombre

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

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
          <h2>{step === 1 ? 'Eliminar producto' : 'Confirmar eliminación'}</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar" disabled={saving}>×</button>
        </header>
        <div className="form-grid">
          {step === 1 ? (
            <>
              <div className="span-2 confirmar-delete-step">
                <span className="material-symbols-outlined">warning</span>
                <p>
                  ¿Eliminar <strong>{productoNombre}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
                <button type="button" className="primary" onClick={() => setStep(2)} disabled={saving}
                  style={{ background: 'var(--off)', color: '#fff' }}>
                  Eliminar
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="span-2 confirmar-delete-step">
                <span className="material-symbols-outlined">edit_off</span>
                <p>
                  Escribe el nombre del producto para confirmar: <strong>{productoNombre}</strong>
                </p>
              </div>
              <label className="span-2">
                Nombre del producto
                <input
                  ref={inputRef}
                  className="confirmar-delete-input"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={productoNombre}
                  disabled={saving}
                  autoComplete="off"
                />
              </label>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
                <button type="button" className="primary" onClick={onConfirm} disabled={!enabled || saving}
                  style={{ background: 'var(--off)', color: '#fff' }}>
                  {saving ? 'Eliminando…' : 'Confirmar eliminación'}
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
