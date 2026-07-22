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

  async function handleApply() {
    if (!pixelCrop) return
    setProcesando(true)
    try {
      const img = await loadImage(image)
      const canvas = document.createElement('canvas')
      const ratio = pixelCrop.width / pixelCrop.height
      const width = Math.min(pixelCrop.width, ANCHO_MAX)
      const height = width / ratio
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear canvas')
      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        width,
        height
      )
      const blob = await recortarYConvertir(canvas)
      onApply(blob)
    } catch {
      // Silenciar error de procesamiento
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
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="image-editor-controls">
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
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}
