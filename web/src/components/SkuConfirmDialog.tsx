import { useState, useEffect, useRef } from 'react'

type Props = {
  currentSku: string
  onConfirm: () => void
  onCancel: () => void
}

export function SkuConfirmDialog({ currentSku, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typedSku, setTypedSku] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const enabled = typedSku === currentSku

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
          <h2>Confirmar cambio de SKU</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar">×</button>
        </header>
        <div className="form-grid">
          {step === 1 ? (
            <>
              <div className="span-2 confirmar-delete-step">
                <span className="material-symbols-outlined">warning</span>
                <p>
                  Cambiar el SKU no afecta el inventario, pero las imágenes NO se renombran. ¿Continuar?
                </p>
              </div>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={onCancel}>Cancelar</button>
                <button type="button" className="primary" onClick={() => setStep(2)}>
                  Entendido, continuar
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="span-2 confirmar-delete-step">
                <span className="material-symbols-outlined">edit_off</span>
                <p>
                  Escribe el SKU actual para confirmar: <strong>{currentSku}</strong>
                </p>
              </div>
              <label className="span-2">
                SKU actual
                <input
                  ref={inputRef}
                  className="confirmar-delete-input"
                  value={typedSku}
                  onChange={(e) => setTypedSku(e.target.value)}
                  placeholder={currentSku}
                  autoComplete="off"
                />
              </label>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={onCancel}>Cancelar</button>
                <button type="button" className="primary" onClick={onConfirm} disabled={!enabled}
                  style={{ background: 'var(--off)', color: '#fff' }}>
                  Confirmar
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
