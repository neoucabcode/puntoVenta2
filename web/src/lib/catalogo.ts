// Catalog export/import logic — JSZip-based export and import functionality.
import JSZip from 'jszip'
import { supabase } from './supabase'

export type CatalogoExport = {
  version: '1.0'
  exportado_en: string
  categorias: Array<{ nombre: string; codigo?: string }>
  productos: Array<{
    nombre: string
    sku: string
    codigo_barras?: string
    categoria_nombre: string
    unidad: string
    costo_usd: number
    precio_usd: number
    imagen_archivo?: string
  }>
}

export type ImportProgress = {
  phase: 'categorias' | 'productos' | 'imagenes'
  current: number
  total: number
}

export type ExportProgress = {
  phase: 'descargando_imagenes' | 'empaquetando_zip'
  current: number
  total: number
}

export type ImportResult = {
  imported: number
  categories: number
  errors: string[]
}

export type ExportResult = {
  blob: Blob
  missingImages: number
}

/** Batch size for parallel image downloads. 10 balances throughput and avoids saturating the network. */
const DOWNLOAD_BATCH_SIZE = 10

// ─── Export ──────────────────────────────────────────────────────────

/** Validates that a CatalogoExport JSON has the required structure. */
export function validarCatalogoJson(json: unknown): json is CatalogoExport {
  if (typeof json !== 'object' || json === null) return false
  const obj = json as Record<string, unknown>
  if (obj.version !== '1.0') return false
  if (!Array.isArray(obj.categorias)) return false
  if (!Array.isArray(obj.productos)) return false
  for (const cat of obj.categorias) {
    if (typeof cat !== 'object' || cat === null) return false
    if (typeof (cat as Record<string, unknown>).nombre !== 'string') return false
  }
  for (const prod of obj.productos) {
    if (typeof prod !== 'object' || prod === null) return false
    const p = prod as Record<string, unknown>
    if (typeof p.nombre !== 'string') return false
    if (typeof p.sku !== 'string') return false
    if (typeof p.categoria_nombre !== 'string') return false
  }
  return true
}

export async function exportarCatalogo(
  empresaId: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  if (!supabase) throw new Error('No hay conexion con la base de datos')
  if (!empresaId) throw new Error('No se pudo determinar la empresa')

  // 1. Fetch categories
  const { data: cats, error: catsErr } = await supabase
    .from('categoria')
    .select('id,nombre,codigo')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
  if (catsErr) throw catsErr

  const categorias = (cats ?? []) as Array<{ id: string; nombre: string; codigo?: string | null }>
  const catIdToNombre = new Map(categorias.map((c) => [c.id, c.nombre]))

  // 2. Fetch products
  const { data: prods, error: prodsErr } = await supabase
    .from('producto')
    .select('id,sku,nombre,categoria_id,unidad,costo_usd,precio_usd,imagen_url,codigo_barras')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true })
  if (prodsErr) throw prodsErr

  const productos = (prods ?? []) as Array<{
    id: string; sku: string | null; nombre: string; categoria_id: string | null
    unidad: string; costo_usd: number; precio_usd: number
    imagen_url: string | null; codigo_barras: string | null
  }>

  // 3. Build catalog JSON
  const catalogo: CatalogoExport = {
    version: '1.0',
    exportado_en: new Date().toISOString(),
    categorias: categorias.map((c) => ({
      nombre: c.nombre,
      ...(c.codigo ? { codigo: c.codigo } : {}),
    })),
    productos: productos.map((p) => ({
      nombre: p.nombre,
      sku: p.sku ?? '',
      ...(p.codigo_barras ? { codigo_barras: p.codigo_barras } : {}),
      categoria_nombre: (p.categoria_id ? catIdToNombre.get(p.categoria_id) : null) ?? 'Sin categoría',
      unidad: p.unidad,
      costo_usd: p.costo_usd,
      precio_usd: p.precio_usd,
      ...(p.imagen_url && p.sku ? { imagen_archivo: `imagenes/${p.sku}.webp` } : {}),
    })),
  }

  // 4. Build ZIP
  const zip = new JSZip()
  zip.file('catalogo.json', JSON.stringify(catalogo, null, 2))
  const imgFolder = zip.folder('imagenes')!

  // 5. Download images in parallel batches.
  // Falls back to old SKU-based path for products uploaded before the 2026-07-28
  // UUID migration that haven't been backfilled yet.
  const productosConImagen = productos.filter((p) => p.imagen_url && p.sku)
  const totalImagenes = productosConImagen.length
  let missingImages = 0
  let completed = 0

  onProgress?.({ phase: 'descargando_imagenes', current: 0, total: totalImagenes })

  for (let i = 0; i < productosConImagen.length; i += DOWNLOAD_BATCH_SIZE) {
    const batch = productosConImagen.slice(i, i + DOWNLOAD_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (p) => {
        // Try new UUID-based path first
        const newPath = `${empresaId}/${p.id}.webp`
        let { data: blob, error: dlErr } = await supabase!.storage
          .from('productos')
          .download(newPath)

        // Fallback to old SKU-based path (legacy products pre-2026-07-28)
        if (dlErr || !blob) {
          const oldPath = `${empresaId}/${p.sku}.webp`
          const fallback = await supabase!.storage
            .from('productos')
            .download(oldPath)
          blob = fallback.data
          dlErr = fallback.error
        }

        return { sku: p.sku, blob, error: dlErr }
      })
    )

    for (const { sku, blob, error } of results) {
      completed++
      if (error || !blob) {
        console.warn(`[exportarCatalogo] imagen no encontrada para ${sku}`)
        missingImages++
        continue
      }
      // STORE (no compression) — webp is already compressed, DEFLATE just adds CPU cost
      imgFolder.file(`${sku}.webp`, blob, { compression: 'STORE' })
    }

    onProgress?.({
      phase: 'descargando_imagenes',
      current: completed,
      total: totalImagenes,
    })
  }

  if (missingImages > 0) {
    console.warn(`[exportarCatalogo] ${missingImages} productos sin imagen en el ZIP. Corre backfill-images para migrarlas.`)
  }

  // 6. Generate ZIP
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (metadata) => {
      onProgress?.({
        phase: 'empaquetando_zip',
        current: Math.round(metadata.percent),
        total: 100,
      })
    }
  )

  return { blob, missingImages }
}

// ─── Import ──────────────────────────────────────────────────────────

export async function importarCatalogo(
  file: File | Blob,
  empresaId: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  if (!supabase) throw new Error('No hay conexion con la base de datos')
  if (!empresaId) throw new Error('No se pudo determinar la empresa')

  // 1. Parse ZIP
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('Archivo ZIP no valido. Verifique el formato.')
  }

  // 2. Validate catalogo.json
  const catalogoFile = zip.file('catalogo.json')
  if (!catalogoFile) {
    throw new Error('El ZIP no contiene catalogo.json. Verifique el formato.')
  }
  const catalogoText = await catalogoFile.async('text')
  let catalogo: CatalogoExport
  try {
    catalogo = JSON.parse(catalogoText)
  } catch {
    throw new Error('catalogo.json tiene formato JSON invalido.')
  }
  if (!validarCatalogoJson(catalogo)) {
    throw new Error('catalogo.json tiene estructura invalida. Verifique el formato.')
  }

  // 3. Import categories (dedup by name)
  const { data: existingCats, error: catListErr } = await supabase
    .from('categoria')
    .select('id,nombre')
    .eq('empresa_id', empresaId)
  if (catListErr) throw catListErr

  const existingCatMap = new Map(
    (existingCats ?? []).map((c: { id: string; nombre: string }) => [c.nombre, c.id])
  )
  const newCatMap = new Map<string, string>() // nombre → id (existing or new)

  // Initialize with existing categories
  for (const [nombre, id] of existingCatMap) {
    newCatMap.set(nombre, id)
  }

  const totalCats = catalogo.categorias.length
  let createdCats = 0

  for (let i = 0; i < totalCats; i++) {
    const cat = catalogo.categorias[i]
    onProgress?.({ phase: 'categorias', current: i + 1, total: totalCats })

    if (!newCatMap.has(cat.nombre)) {
      const { data: newCat, error: catInsErr } = await supabase
        .from('categoria')
        .insert({ nombre: cat.nombre, empresa_id: empresaId })
        .select('id,nombre')
        .single()
      if (catInsErr || !newCat) {
        // Skip failed category
        continue
      }
      newCatMap.set(cat.nombre, (newCat as { id: string }).id)
      createdCats++
    }
  }

  // 4. Import products
  const totalProds = catalogo.productos.length
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < totalProds; i++) {
    const prod = catalogo.productos[i]
    onProgress?.({ phase: 'productos', current: i + 1, total: totalProds })

    const catId = newCatMap.get(prod.categoria_nombre) ?? null

    const { error: prodInsErr } = await supabase
      .from('producto')
      .insert({
        empresa_id: empresaId,
        sku: prod.sku || null,
        nombre: prod.nombre,
        codigo_barras: prod.codigo_barras ?? null,
        categoria_id: catId,
        unidad: prod.unidad || 'unidad',
        costo_usd: prod.costo_usd,
        precio_usd: prod.precio_usd,
      })
    if (prodInsErr) {
      errors.push(`Error creando "${prod.nombre}": ${prodInsErr.message}`)
      continue
    }
    imported++
  }

  // 5. Import images
  const imgFolder = zip.folder('imagenes')
  if (imgFolder) {
    const imgFiles: JSZip.JSZipObject[] = []
    imgFolder.forEach((_path, entry) => {
      if (!entry.dir && entry.name.endsWith('.webp')) {
        imgFiles.push(entry)
      }
    })

    // We need to find the newly created products to upload images to their IDs.
    // Since SKUs are preserved, we can look up by SKU.
    const totalImgs = imgFiles.length
    for (let i = 0; i < totalImgs; i++) {
      const entry = imgFiles[i]
      onProgress?.({ phase: 'imagenes', current: i + 1, total: totalImgs })

      // Extract SKU from filename (e.g., FER-001.webp → FER-001)
      const imgSku = entry.name.replace(/^imagenes\//, '').replace(/\.webp$/, '')

      // Find the product by SKU
      const { data: prodRow } = await supabase
        .from('producto')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('sku', imgSku)
        .single()

      if (!prodRow) continue

      const blob = await entry.async('blob')
      const filePath = `${empresaId}/${(prodRow as { id: string }).id}.webp`
      await supabase.storage
        .from('productos')
        .upload(filePath, blob, { upsert: true, contentType: 'image/webp' })
    }
  }

  return { imported, categories: createdCats, errors }
}
