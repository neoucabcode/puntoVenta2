// Backfill de imagenes: migra archivos del path viejo (basado en SKU) al path
// nuevo (basado en UUID). Necesario por la migracion del 2026-07-28 que
// cambio el path pattern de {empresa_id}/{sku}.webp a {empresa_id}/{producto_id}.webp
// sin copiar los archivos existentes.
//
// Uso:
//   import { backfillImagenes } from './backfill-images'
//   const result = await backfillImagenes({ dryRun: false, empresaId: 'uuid' })
//
// El script es idempotente: corre multiples veces, los productos ya migrados se skipean.
//
// Pre-requisito: patch_13_backfill_image_paths.sql aplicado (solo auditoria,
// el backfill real es este script).

import { supabase } from './supabase'

export type BackfillResult = {
  total: number
  migrados: number
  yaMigrados: number
  noEncontrados: number
  errores: Array<{ sku: string; error: string }>
}

export type BackfillOptions = {
  /** Si true, simula sin hacer cambios. Default false. */
  dryRun?: boolean
  /** Si provisto, solo procesa productos de esa empresa. Si no, procesa todas. */
  empresaId?: string
  /** Si true, no borra los archivos viejos despues de migrar. Default false. */
  keepOld?: boolean
}

type ProductoParaBackfill = {
  id: string
  sku: string
  empresa_id: string
  imagen_url: string
}

/**
 * Detecta que productos necesitan migracion de imagen.
 * Un producto necesita migracion si:
 * - tiene imagen_url
 * - tiene sku
 * - su imagen_url apunta al path viejo (no contiene su UUID en la URL)
 */
async function detectarProductosAMigrar(
  empresaId?: string
): Promise<ProductoParaBackfill[]> {
  if (!supabase) {
    throw new Error('Backfill requiere conexion con Supabase')
  }

  let query = supabase
    .from('producto')
    .select('id, sku, empresa_id, imagen_url')
    .not('imagen_url', 'is', null)
    .not('sku', 'is', null)

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  }

  const { data, error } = await query
  if (error) throw error

  // Filtrar los que ya estan en el path nuevo (la URL contiene su UUID)
  const candidates = (data ?? []) as ProductoParaBackfill[]
  return candidates.filter((p) => !p.imagen_url.includes(p.id))
}

/**
 * Migra las imagenes de productos del path viejo (SKU) al nuevo (UUID).
 * Ver catalogo.ts exportarCatalogo para el flujo complementario en el export.
 */
export async function backfillImagenes(
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  if (!supabase) {
    throw new Error('Backfill requiere conexion con Supabase')
  }

  const { dryRun = false, empresaId, keepOld = false } = options
  const result: BackfillResult = {
    total: 0,
    migrados: 0,
    yaMigrados: 0,
    noEncontrados: 0,
    errores: [],
  }

  console.log('[backfill] Iniciando migracion de imagenes...')
  if (dryRun) console.log('[backfill] DRY RUN — no se haran cambios')
  if (empresaId) console.log(`[backfill] Filtrando por empresa: ${empresaId}`)

  const productos = await detectarProductosAMigrar(empresaId)
  result.total = productos.length
  console.log(`[backfill] ${productos.length} productos detectados con imagen en path viejo`)

  for (const p of productos) {
    const oldPath = `${p.empresa_id}/${p.sku}.webp`
    const newPath = `${p.empresa_id}/${p.id}.webp`

    try {
      // 1. Verificar si el nuevo ya existe (idempotencia)
      const { data: listData } = await supabase.storage
        .from('productos')
        .list(p.empresa_id, { search: `${p.id}.webp` })

      const newExists = (listData ?? []).some(
        (f) => f.name === `${p.id}.webp`
      )

      if (newExists) {
        console.log(`[backfill] SKIP ${p.sku} — ya migrado`)
        result.yaMigrados++
        continue
      }

      // 2. Descargar del path viejo
      const { data: blob, error: dlErr } = await supabase.storage
        .from('productos')
        .download(oldPath)

      if (dlErr || !blob) {
        console.warn(`[backfill] WARN ${p.sku} — no encontrado en path viejo (${oldPath})`)
        result.noEncontrados++
        continue
      }

      if (dryRun) {
        console.log(`[backfill] [dry] migraria ${oldPath} -> ${newPath}`)
        result.migrados++
        continue
      }

      // 3. Subir al path nuevo (upsert por si acaso)
      const { error: upErr } = await supabase.storage
        .from('productos')
        .upload(newPath, blob, {
          upsert: true,
          contentType: 'image/webp',
        })

      if (upErr) throw upErr

      // 4. Actualizar imagen_url en DB con cache-busting
      const { data: urlData } = supabase.storage
        .from('productos')
        .getPublicUrl(newPath)
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: dbErr } = await supabase
        .from('producto')
        .update({ imagen_url: newUrl })
        .eq('id', p.id)

      if (dbErr) throw dbErr

      // 5. Borrar el viejo (a menos que keepOld)
      if (!keepOld) {
        const { error: rmErr } = await supabase.storage
          .from('productos')
          .remove([oldPath])
        if (rmErr) {
          console.warn(`[backfill] WARN ${p.sku} — no se pudo borrar viejo: ${rmErr.message}`)
        }
      }

      console.log(`[backfill] OK ${p.sku} (${oldPath} -> ${newPath})`)
      result.migrados++
    } catch (err) {
      console.error(`[backfill] ERROR ${p.sku}:`, err)
      result.errores.push({
        sku: p.sku,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log('\n[backfill] === Resumen ===')
  console.log(`[backfill] Total detectados:    ${result.total}`)
  console.log(`[backfill] Migrados:           ${result.migrados}`)
  console.log(`[backfill] Ya migrados (skip): ${result.yaMigrados}`)
  console.log(`[backfill] No encontrados:     ${result.noEncontrados}`)
  console.log(`[backfill] Errores:            ${result.errores.length}`)

  if (!dryRun && result.migrados > 0 && !keepOld) {
    console.log('[backfill] Sugerencia: exportar el catalogo para verificar las nuevas URLs')
  }

  return result
}
