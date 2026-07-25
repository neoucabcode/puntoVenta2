import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'
import { recortarYConvertir } from '../lib/imageUtils'

interface ImageEditorProps {
  image: string
  onApply: (blob: Blob) => void
  onCancel: () => void
  onPaste?: (blob: Blob) => void
}

interface CroppedArea {
  x: number
  y: number
  width: number
  height: number
}

const ANCHO_MAX = 600

export function ImageEditor({ image, onApply, onCancel, onPaste }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const croppedAreaRef = useRef<CroppedArea | null>(null)
  const [hasCropped, setHasCropped] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [applyError, setApplyError] = useState('')

  const imageValid = image && image.length > 0 && !imgError

  const onCropComplete = useCallback(
    (croppedArea: CroppedArea) => {
      croppedAreaRef.current = croppedArea
      setHasCropped(true)
    },
    []
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  // Validate image loads on mount
  useEffect(() => {
    if (!image) {
      setImgError(true)
      return
    }
    const img = new Image()
    img.onload = () => {}
    img.onerror = () => setImgError(true)
    img.src = image
  }, [image])

  async function handleApply() {
    const croppedArea = croppedAreaRef.current
    if (!croppedArea) return
    setProcesando(true)
    setApplyError('')
    try {
      const img = await loadImage(image)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear canvas')

      // When the user zooms out enough, the crop percentages cover nearly
      // the full image. In that case, output the entire image instead of a
      // cropped portion — this matches the user's intent of "keep the whole thing".
      const coversFullImage =
        croppedArea.width >= 98 &&
        croppedArea.height >= 98

      if (coversFullImage) {
        const outW = Math.min(img.naturalWidth, ANCHO_MAX)
        const outH = outW * (img.naturalHeight / img.naturalWidth)
        canvas.width = outW
        canvas.height = outH
        ctx.drawImage(img, 0, 0, outW, outH)
      } else {
        // croppedArea is in percentages (0-100) of the image, as provided by
        // react-easy-crop's onCropComplete. Since the Cropper renders the image
        // with uniform scaling (contain + zoom), these percentages are identical
        // whether relative to the displayed image or the natural image.
        // Convert to natural image pixel coordinates for the canvas crop.
        const naturalX = (croppedArea.x / 100) * img.naturalWidth
        const naturalY = (croppedArea.y / 100) * img.naturalHeight
        const naturalW = (croppedArea.width / 100) * img.naturalWidth
        const naturalH = (croppedArea.height / 100) * img.naturalHeight

        const ratio = naturalW / naturalH
        const outW = Math.min(naturalW, ANCHO_MAX)
        const outH = outW / ratio

        canvas.width = outW
        canvas.height = outH
        ctx.drawImage(
          img,
          naturalX, naturalY,
          naturalW, naturalH,
          0, 0,
          outW, outH
        )
      }

      const blob = await recortarYConvertir(canvas)
      onApply(blob)
    } catch (err) {
      setApplyError((err as Error).message || 'Error al procesar la imagen')
    } finally {
      setProcesando(false)
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            if (blob && onPaste) {
              onPaste(blob)
              return
            }
          }
        }
      }
      setApplyError('No se encontró imagen en el portapapeles')
    } catch {
      setApplyError('No se pudo acceder al portapapeles')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal image-editor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Editar imagen</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="image-editor-crop">
          {imageValid ? (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#fff',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              No se pudo cargar la imagen
            </div>
          )}
        </div>
        <div className="image-editor-controls">
          {applyError && (
            <p style={{ color: '#e53935', fontSize: '0.85rem', width: '100%', textAlign: 'center', margin: '0 0 0.5rem' }}>
              {applyError}
            </p>
          )}
          {onPaste && (
            <button
              type="button"
              className="image-editor-paste-btn"
              onClick={handlePasteFromClipboard}
              title="Pegar imagen del portapapeles"
            >
              <span className="material-symbols-outlined">content_paste</span>
            </button>
          )}
          <label className="image-editor-zoom-label">
            <span className="material-symbols-outlined">zoom_out</span>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span className="material-symbols-outlined">zoom_in</span>
          </label>
        </div>
        <footer className="modal-footer image-editor-footer">
          <button type="button" onClick={onCancel} disabled={procesando}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleApply}
            disabled={procesando || !hasCropped}
          >
            {procesando ? 'Procesando…' : 'Aplicar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // No usar crossOrigin con blob URLs — causa CORS failure silencioso
    if (!src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}
