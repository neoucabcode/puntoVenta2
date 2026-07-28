import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { importarCatalogo, type ImportProgress } from '../lib/catalogo'
import { obtenerMiEmpresaId } from '../lib/empresa'

type Props = {
  onClose: () => void
  onImported: () => void
}

type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; progress: ImportProgress | null }
  | { status: 'success'; imported: number; categories: number }
  | { status: 'error'; message: string; errors?: string[] }

export function CatalogImportModal({ onClose, onImported }: Props) {
  const [state, setState] = useState<ImportState>({ status: 'idle' })
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const procesarArchivo = useCallback(async (file: File) => {
    // Validate ZIP extension
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip') {
      setState({ status: 'error', message: 'Archivo ZIP no válido. Verifique el formato.' })
      return
    }

    const empresaId = await obtenerMiEmpresaId()
    if (!empresaId) {
      setState({ status: 'error', message: 'No se pudo determinar la empresa.' })
      return
    }

    setState({ status: 'importing', progress: null })

    try {
      const result = await importarCatalogo(file, empresaId, (progress) => {
        setState({ status: 'importing', progress })
      })
      setState({
        status: 'success',
        imported: result.imported,
        categories: result.categories,
      })
      if (result.errors.length === 0) {
        onImported()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setState({ status: 'error', message })
    }
  }, [onImported])

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      void procesarArchivo(files[0])
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      void procesarArchivo(files[0])
    }
  }

  function handleReset() {
    setState({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Importar catálogo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" disabled={state.status === 'importing'}>×</button>
        </header>
        <div className="form-grid">
          {state.status === 'idle' && (
            <>
              <div
                className={`catalog-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
              >
                <span className="material-symbols-outlined">upload_file</span>
                <p>Arrastra un archivo ZIP del catálogo aquí</p>
                <p className="catalog-drop-hint">o haz clic para seleccionar</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip"
                  aria-label="Seleccionar archivo ZIP"
                  onChange={handleFileChange}
                  style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
                />
              </div>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={onClose}>Cancelar</button>
              </footer>
            </>
          )}

          {state.status === 'importing' && (
            <div className="catalog-progress">
              <div className="catalog-progress-spinner" />
              <p>Importando catálogo…</p>
              {state.progress && (
                <p className="catalog-progress-detail">
                  {state.progress.phase === 'categorias' && 'Importando categorías'}
                  {state.progress.phase === 'productos' && 'Importando productos'}
                  {state.progress.phase === 'imagenes' && 'Importando imágenes'}
                  : {state.progress.current}/{state.progress.total}
                </p>
              )}
            </div>
          )}

          {state.status === 'success' && (
            <>
              <div className="catalog-success">
                <span className="material-symbols-outlined">check_circle</span>
                <p>
                  Importados: {state.imported} productos, {state.categories} categorías nuevas.
                </p>
              </div>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={handleReset}>Importar otro</button>
                <button type="button" className="primary" onClick={onClose}>Cerrar</button>
              </footer>
            </>
          )}

          {state.status === 'error' && (
            <>
              <div className="catalog-error">
                <span className="material-symbols-outlined">error</span>
                <p>{state.message}</p>
              </div>
              <footer className="span-2 modal-footer">
                <button type="button" onClick={handleReset}>Reintentar</button>
                <button type="button" onClick={onClose}>Cerrar</button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
