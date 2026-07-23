import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { recortarYConvertir } from '../lib/imageUtils'

interface ImageEditorProps {
  image: string
  onApply: (blob: Blob) => void
  onCancel: () => void
}

interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

const ANCHO_MAX = 600

export function ImageEditor({ image, onApply, onCancel }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [applyError, setApplyError] = useState('')

  const imageValid = image && image.length > 0 && !imgError

  const onCropComplete = useCallback(
    (_croppedArea: unknown, croppedAreaPixels: PixelCrop) => {
      setPixelCrop(croppedAreaPixels)
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
    if (!pixelCrop) return
    setProcesando(true)
    setApplyError('')
    try {
      const img = await loadImage(image)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear canvas')

      // onCropComplete devuelve coordenadas relativas al tamaño displayado.
      // Para dibujar sobre la imagen natural, hay que escalar.
      const scaleX = img.naturalWidth / img.width
      const scaleY = img.naturalHeight / img.height

      const srcX = pixelCrop.x * scaleX
      const srcY = pixelCrop.y * scaleY
      const srcW = pixelCrop.width * scaleX
      const srcH = pixelCrop.height * scaleY

      // Limitar ancho máximo manteniendo proporción
      const ratio = pixelCrop.width / pixelCrop.height
      const outW = Math.min(srcW, ANCHO_MAX)
      const outH = outW / ratio

      canvas.width = outW
      canvas.height = outH

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
      const blob = await recortarYConvertir(canvas)
      onApply(blob)
    } catch (err) {
      setApplyError((err as Error).message || 'Error al procesar la imagen')
    } finally {
      setProcesando(false)
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
              aspect={4 / 3}
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
          <label className="image-editor-zoom-label">
            <span className="material-symbols-outlined">zoom_out</span>
            <input
              type="range"
              min={0.5}
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
            disabled={procesando || !pixelCrop}
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
