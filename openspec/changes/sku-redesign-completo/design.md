# Design: SKU Redesign Completo

## Technical Approach

Decouple image storage from SKU via UUID-based paths, enforce SKU immutability with admin override, add real-time availability feedback via debounced RPC, and enable catalog portability through client-side ZIP export/import. All changes respect multi-tenant isolation (`empresa_id` + RLS).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Storage path | `{empresa_id}/{producto_id}.webp` | `{empresa_id}/{sku}.webp` (current), `{empresa_id}/{uuid}.webp` | `producto_id` is stable UUID, already in DB, no extra column needed. SKU rename no longer breaks images. |
| Backfill strategy | Idempotent client-side script (copy→verify→delete) | SQL-only, server-side Edge Function | Client-side leverages existing Supabase Storage SDK + RLS. Idempotent: checks new path before copy. Rollback = restore `imagen_url` to old paths. |
| SKU immutability | Admin toggle + confirmation dialog (custom component) | DB constraint, native `confirm()`, read-only field | DB constraint too rigid (breaks legitimate admin regen). Native `confirm()` banned by project convention. Custom dialog matches `ConfirmarEliminarModal` pattern. |
| Real-time SKU check | Debounce 300ms → RPC `verificar_sku_disponible` → indicator | Eager check on every keystroke, blur-only check | Debounce avoids rate limiting. RPC is single index lookup (cheap). Follows existing `useSkuPreview` debounce pattern. |
| Similar products | Dropdown below SKU input (like catalog search) | Inline alert, modal | Non-blocking, consistent with `DuplicadoAlert` pattern already in form. |
| Catalog export | Client-side ZIP via JSZip (no server) | Server-side Edge Function, direct download | No server cost. JSZip is ~45KB gzipped. Images fetched from Storage public URLs. |
| Catalog import | Drag & drop ZIP → process categories → products → images | File input only, server import | Drag & drop matches existing image upload UX in `ProductoForm`. Client-side processing keeps it simple. |

## Data Flow

### Image Upload (post-migration)

```
ProductoForm → subirImagenProducto(file, empresaId, productoId)
  → convertToWebp (if needed)
  → supabase.storage.from('productos').upload(`${empresaId}/${productoId}.webp`)
  → update producto.imagen_url
```

### SKU Availability Check

```
User types SKU → debounce 300ms → useSkuDisponibilidad hook
  → supabase.rpc('verificar_sku_disponible', { p_empresa_id, p_sku })
  → { disponible: boolean } → green/red indicator
```

### Catalog Export

```
InventarioPage "Exportar" click → catalogo.exportarCatalogo(empresaId)
  → fetch all products + categories via RPC
  → for each product with imagen_url: fetch blob
  → JSZip: catalogo.json + imagenes/{sku}.webp
  → saveAs(zip, `catalogo-{empresa}.zip`)
```

### Catalog Import

```
Drag & drop ZIP → CatalogImportModal
  → JSZip.loadAsync(file)
  → validate catalogo.json structure
  → create categories (dedup by name)
  → create products (preserve original SKU)
  → upload images to new paths
  → show per-item progress
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web/src/lib/productos.ts` | Modify | Change `subirImagenProducto` param from `sku` to `productoId`. Update path to `${empresaId}/${productoId}.webp`. Remove `renombrarImagen`. Update `eliminarProducto` and `eliminarImagenProducto` to use `productoId` path. |
| `web/src/lib/sku.ts` | Modify | Add `verificarSkuDisponible(empresaId, sku)` function calling RPC. |
| `web/src/hooks/useSkuDisponibilidad.ts` | Create | New hook: debounce 300ms, call `verificarSkuDisponible`, return `{ disponible, verificando }`. |
| `web/src/hooks/useSkuPreview.ts` | Modify | No changes needed (already has 300ms debounce, separate concern). |
| `web/src/components/ProductoForm.tsx` | Modify | Add `useSkuDisponibilidad` hook. Render availability indicator (✅/❌) next to SKU input. Add similar products dropdown below SKU. Replace inline confirm dialog with `SkuConfirmDialog`. Pass `productoId` (not SKU) to `subirImagenProducto`. Remove `renombrarImagen` call from `handleRegenerarSku`. |
| `web/src/components/SkuConfirmDialog.tsx` | Create | Two-step confirmation dialog (matches `ConfirmarEliminarModal` pattern): step 1 = warning, step 2 = type SKU to confirm. Props: `{ currentSku, onConfirm, onCancel }`. |
| `web/src/components/SkuAvailabilityIndicator.tsx` | Create | Small inline component: spinner while checking, ✅ green "Disponible", ❌ red "Ya existe". Props: `{ disponible, verificando }`. |
| `web/src/components/SkuSimilarDropdown.tsx` | Create | Dropdown list below SKU input showing similar products. Props: `{ productos, onSelect, onDismiss }`. |
| `web/src/components/CatalogImportModal.tsx` | Create | Drag & drop modal for ZIP import. Shows progress per item. Validates structure before processing. |
| `web/src/lib/catalogo.ts` | Create | `exportarCatalogo(empresaId)`: fetch data, build ZIP via JSZip. `importarCatalogo(file, empresaId)`: parse ZIP, create categories/products/images. |
| `web/src/pages/InventarioPage.tsx` | Modify | Add "Exportar catálogo" button in toolbar. Add "Importar catálogo" button that opens `CatalogImportModal`. |
| `web/src/index.css` | Modify | Add styles for `.sku-availability`, `.sku-similar-dropdown`, `.catalog-import-modal`, `.catalog-progress`. |
| `supabase/patch_13_backfill_image_paths.sql` | Create | Idempotent SQL: for each product with `imagen_url` containing old SKU-based path, log the mapping. (Actual file copy done by client script.) |
| `web/src/lib/backfill-images.ts` | Create | Idempotent script: iterate products, copy `${empresaId}/${sku}.webp` → `${empresaId}/${productoId}.webp`, verify copy, delete old. Reports progress. |
| `web/src/lib/productos.test.ts` | Modify | Add tests for `subirImagenProducto` with `productoId` param. |
| `web/src/hooks/useSkuDisponibilidad.test.ts` | Create | Unit tests for debounce + RPC call + state transitions. |
| `web/src/components/SkuConfirmDialog.test.tsx` | Create | Tests for two-step confirmation flow. |
| `web/src/lib/catalogo.test.ts` | Create | Tests for export/import logic (mock ZIP, mock Supabase). |

## Interfaces / Contracts

```typescript
// New hook
export function useSkuDisponibilidad(sku: string, empresaId: string | null): {
  disponible: boolean | null  // null = not yet checked
  verificando: boolean
}

// New RPC wrapper (sku.ts)
export async function verificarSkuDisponible(
  empresaId: string, sku: string
): Promise<boolean>  // true = available

// Updated signature (productos.ts)
export async function subirImagenProducto(
  file: File, empresaId: string, productoId: string  // was: sku: string
): Promise<string>

// Catalog types (catalogo.ts)
export type CatalogoExport = {
  version: '1.0'
  exportado_en: string
  categorias: Array<{ nombre: string; codigo?: string }>
  productos: Array<{
    nombre: string; sku: string; codigo_barras?: string
    categoria_nombre: string; unidad: string
    costo_usd: number; precio_usd: number
    imagen archivo?: string  // filename in ZIP
  }>
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useSkuDisponibilidad` debounce + state | Vitest: mock `verificarSkuDisponible`, advance timers |
| Unit | `SkuConfirmDialog` two-step flow | RTL: render, click step 1, type SKU, confirm |
| Unit | `catalogo.ts` export/import | Vitest: mock Supabase + JSZip, verify ZIP structure |
| Unit | `subirImagenProducto` with `productoId` | Vitest: mock Supabase storage, verify path format |
| Integration | ProductoForm SKU indicator + dropdown | RTL: render form, type SKU, assert indicator appears |
| Integration | InventarioPage export/import buttons | RTL: render page, click export, verify download triggered |
| E2E | Full catalog export → import roundtrip | Manual: export catalog, import in fresh tenant, verify data |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The backfill script runs in-browser via Supabase SDK, not as a shell command.

## Migration / Rollout

1. **Phase 1 — Storage migration**: Run `backfill-images.ts` per tenant. Idempotent: skips products already at new path. Verify: check all `imagen_url` entries resolve. Old paths retained until verification passes.
2. **Phase 2 — Code deploy**: Deploy updated `productos.ts` (new path logic) + new components. Images now read from UUID paths. If backfill incomplete, images at old paths 404 (acceptable: backfill must run first).
3. **Phase 3 — SKU immutability**: Enable via `empresa_configuracion_sku.sku_inmutable` flag (or reuse existing config). Default: disabled. Admin toggles per-tenant.
4. **Phase 4 — Catalog export/import**: Pure additive UI. No migration needed.

**Rollback**: Storage = restore `imagen_url` to old paths + delete new. Code = revert deploy. SKU immutability = toggle flag off.

## Open Questions

- [ ] Does `verificar_sku_disponible` RPC already exist, or does it need to be created in `patch_11_sku_configurable.sql`? (Proposal references it but grep shows only spec mentions.)
- [ ] Should the backfill script be a one-time admin button in InventarioPage, or a standalone script run via `npx`?
- [ ] For catalog import: should products with duplicate SKUs be skipped, rejected, or overwritten?
