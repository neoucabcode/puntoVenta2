const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_TAMANO = 5 * 1024 * 1024 // 5 MB

export function validarImagen(file: File): { ok: boolean; error?: string } {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido: "${file.type}". Use JPEG, PNG, WebP o GIF.`,
    }
  }
  if (file.size > MAX_TAMANO) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      ok: false,
      error: `La imagen es demasiado grande (${mb} MB). El máximo permitido es 5 MB.`,
    }
  }
  return { ok: true }
}

export function recortarYConvertir(
  canvas: HTMLCanvasElement,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('No se pudo generar la imagen'))
      },
      'image/webp',
      quality
    )
  })
}

export async function convertirAWebp(
  file: File,
  maxWidth = 600,
  quality = 0.85
): Promise<Blob> {
  const img = await cargarImagen(file)
  const canvas = document.createElement('canvas')
  const ratio = img.width / img.height
  const width = Math.min(img.width, maxWidth)
  const height = width / ratio
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el contexto del canvas')
  ctx.drawImage(img, 0, 0, width, height)
  return recortarYConvertir(canvas, quality)
}

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen'))
    }
    img.src = url
  })
}
