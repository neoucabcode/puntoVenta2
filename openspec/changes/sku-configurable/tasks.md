# Tasks: SKU Configurable + Fuzzy Matching

> **Change:** `sku-configurable`
> **Specs:** sku-configuration, fuzzy-matching, image-storage
> **Created:** 2026-07-21

---

## Task 1: Database migration — DDL (tables, columns, indexes, trigger)
- **Files**: `supabase/patch_11_sku_configurable.sql` (new)
- **Description**: Create all DDL in one migration file:
  1. `CREATE EXTENSION IF NOT EXISTS pg_trgm`
  2. Table `empresa_configuracion_sku` with RLS + policy `config_sku_propia`
  3. Table `empresa_sku_contador` with RLS + policy `contador_propio`
  4. `ALTER TABLE categoria ADD COLUMN IF NOT EXISTS codigo char(3)` + unique partial index `idx_categoria_codigo_empresa`
  5. Unique partial index `idx_producto_sku_empresa` on `producto(empresa_id, sku) WHERE sku IS NOT NULL`
  6. GiST trigram index `idx_producto_nombre_trgm` on `producto USING gin (nombre gin_trgm_ops)`
  7. Trigger `trg_config_sku_default` on `empresa` to auto-insert default `empresa_configuracion_sku` row
- **Depends on**: none
- **Estimated size**: M
- **Verification**: Connect to Supabase, run the migration, confirm all tables/indexes exist, insert a test empresa and verify trigger creates default config row with `autogenerar_activo = false`

## Task 2: Database migration — RPCs (generar_sku, buscar_productos_similares)
- **Files**: `supabase/patch_11_sku_configurable.sql` (append to Task 1 file)
- **Description**: Add two RPCs to the migration file:
  1. `generar_sku(p_empresa_id uuid, p_categoria_id uuid DEFAULT NULL) RETURNS text` — reads config, atomic counter increment via `INSERT ... ON CONFLICT DO UPDATE`, builds SKU string per template, returns NULL if auto-gen is off
  2. `buscar_productos_similares(p_empresa_id uuid, p_texto text, p_umbral numeric DEFAULT 0.3) RETURNS TABLE (id, nombre, sku, similitud)` — trigram similarity search scoped to empresa, ordered by similarity DESC, limit 10
  - Both use `SECURITY INVOKER`, `LANGUAGE plpgsql` (generar_sku) / `LANGUAGE sql STABLE` (buscar_productos_similares)
- **Depends on**: Task 1
- **Estimated size**: M
- **Verification**: Call `generar_sku` for a empresa with `autogenerar_activo = true` and each template — verify output format matches spec. Call `buscar_productos_similares` with known product names — verify results above threshold are returned, below threshold are excluded, and cross-empresa isolation holds.

## Task 3: TypeScript API layer — `web/src/lib/sku.ts`
- **Files**: `web/src/lib/sku.ts` (new)
- **Description**: Create API functions following existing patterns in `productos.ts`:
  - `EmpresaConfigSku` type matching the design interface
  - `obtenerConfigSku(empresaId: string): Promise<EmpresaConfigSku | null>` — fetch from `empresa_configuracion_sku`
  - `generarSku(empresaId: string, categoriaId?: string): Promise<string | null>` — call RPC
  - `buscarProductosSimilares(empresaId: string, texto: string, umbral?: number): Promise<{id: string; nombre: string; sku: string; similitud: number}[]>` — call RPC
  - `actualizarConfigSku(empresaId: string, config: Partial<EmpresaConfigSku>): Promise<void>` — admin update
  - Include mock fallbacks for offline/dev mode (following `productos.ts` pattern with `if (!supabase)`)
- **Depends on**: Task 2
- **Estimated size**: S
- **Verification**: Import functions, call each against Supabase with test empresa, verify returns match expected types and values

## Task 4: Hook — `web/src/hooks/useEmpresaConfig.ts`
- **Files**: `web/src/hooks/useEmpresaConfig.ts` (new)
- **Description**: React hook that fetches `empresa_configuracion_sku` for the current empresa:
  - Uses `obtenerMiEmpresaId()` + `obtenerConfigSku()`
  - Returns `{ config: EmpresaConfigSku | null, loading: boolean }`
  - Caches result for empresa lifetime (similar pattern to `useUsuarioRol.ts`)
- **Depends on**: Task 3
- **Estimated size**: S
- **Verification**: Render component using hook, confirm `config` populates with correct defaults, `loading` transitions false

## Task 5: Hook — `web/src/hooks/useSkuPreview.ts`
- **Files**: `web/src/hooks/useSkuPreview.ts` (new)
- **Description**: Debounced hook for SKU preview:
  - Takes `categoriaId` as parameter
  - Calls `generarSku` on category change (debounced 300ms)
  - Returns `{ skuPreview: string | null, generando: boolean }`
  - Only generates when empresa config has `autogenerar_activo = true`
- **Depends on**: Task 3
- **Estimated size**: S
- **Verification**: Change category select, confirm SKU preview updates after debounce, confirm it shows "..." during generation

## Task 6: Component — `web/src/components/SkuPreview.tsx`
- **Files**: `web/src/components/SkuPreview.tsx` (new)
- **Description**: Read-only SKU display component:
  - Props: `{ sku: string | null; generando: boolean }`
  - Renders: `"SKU: FER-0012"` when sku present, `"SKU: ..." ` when generating, nothing/null when no SKU
  - Follows project's modal/form styling patterns (CSS classes, not inline styles)
- **Depends on**: none (pure presentational)
- **Estimated size**: S
- **Verification**: Render with sku="FER-0012" → shows "SKU: FER-0012". Render with generando=true → shows "SKU: ...". Render with null → hidden.

## Task 7: Component — `web/src/components/DuplicadoAlert.tsx`
- **Files**: `web/src/components/DuplicadoAlert.tsx` (new)
- **Description**: Warning modal for fuzzy match duplicates:
  - Props: `{ similares: Array<{nombre: string; sku: string; similitud: number}>; onConfirm: () => void; onCancel: () => void }`
  - Renders list of similar products with name, SKU, and similarity percentage
  - Two buttons: "Continuar" (onConfirm) and "Cancelar" (onCancel)
  - Message: "Se encontró un producto similar:" + list
  - Follows existing modal patterns (backdrop, modal, modal-header, modal-footer)
- **Depends on**: none (pure presentational)
- **Estimated size**: S
- **Verification**: Render with mock similar products, confirm modal shows correct data, buttons trigger correct callbacks

## Task 8: Modify `web/src/components/ProductoForm.tsx` — Integrate SKU auto-gen
- **Files**: `web/src/components/ProductoForm.tsx` (modify)
- **Description**: Major integration work:
  1. Import `useEmpresaConfig`, `useSkuPreview`, `generarSku`, `buscarProductosSimilares` from new modules
  2. On mount: fetch empresa config via `useEmpresaConfig()`
  3. If `autogenerar_activo`:
     - Non-admin: SKU input disabled with label "SKU (generado automáticamente)"
     - Admin: checkbox "Auto-generar SKU" — when unchecked, SKU field becomes editable
  4. On category change or form open: trigger `useSkuPreview` to generate SKU
  5. Display `SkuPreview` component below SKU input
  6. Before submit (if auto-gen active): call `buscarProductosSimilares()` with product name
     - If matches above empresa's `umbral_similitud`: show `DuplicadoAlert`
     - User confirms → proceed with submit
     - User cancels → abort submit, keep form open
  7. On edit: if product already has SKU, show it as read-only (unless admin override)
  8. Remove `verificarSkuDuplicado` call (RPC handles uniqueness via DB index)
  9. Import `useUsuarioRol` for admin check (already available in hooks)
- **Depends on**: Tasks 3, 4, 5, 6, 7
- **Estimated size**: L
- **Verification**: Create product flow: open form → SKU preview generates → change category → SKU updates → submit triggers fuzzy check → if similar, alert shows → confirm creates product with auto-SKU. Admin flow: uncheck auto-gen → SKU editable → manual SKU saved. Non-admin flow: SKU field disabled.

## Task 9: Modify `web/src/lib/productos.ts` — SKU-based image paths + cleanup
- **Files**: `web/src/lib/productos.ts` (modify)
- **Description**: Update image handling:
  1. `subirImagenProducto`: change path from `${empresaId}/${productoId}.${ext}` to `${empresaId}/${sku}.${ext}` — add `sku: string` parameter
  2. Add `renombrarImagen(empresaId: string, oldSku: string, newSku: string, ext: string): Promise<void>` — copy file to new path, delete old
  3. Remove `verificarSkuDuplicado` function and its mock import (DB unique index handles it now)
  4. Remove `verificarSkuDuplicadoMock` import from mock-data
  5. Update `Categoria` type to include optional `codigo?: string | null` field
- **Depends on**: Task 1 (unique index must exist before removing client-side check)
- **Estimated size**: M
- **Verification**: Upload image with SKU "TEST-001" → file stored as `{empresaId}/TEST-001.jpg`. Rename SKU to "TEST-002" → file at old path deleted, new path has the file. `verificarSkuDuplicado` no longer exists in module exports.

## Task 10: Product deletion image cleanup
- **Files**: `web/src/lib/productos.ts` (modify)
- **Description**: Update `eliminarProducto` to also delete the image file from storage before removing the product row:
  1. Before deleting the product row, fetch `sku` and `imagen_url` from the product
  2. If `imagen_url` exists, delete the storage file at `{empresa_id}/{sku}.{ext}`
  3. Then delete the product row
- **Depends on**: Task 9
- **Estimated size**: S
- **Verification**: Create product with image, delete it, verify both product row and storage file are removed

## Task 11: SKU regeneration flow
- **Files**: `web/src/components/ProductoForm.tsx` (modify), `web/src/lib/productos.ts` (modify)
- **Description**: Add admin-only "Regenerar SKU" action on existing products:
  1. In ProductoForm (edit mode): show "Regenerar SKU" button for admins
  2. On click: confirmation dialog "¿Regenerar el SKU? El SKU actual quedará registrado en el historial."
  3. On confirm: call `generarSku()` → get new SKU → call `renombrarImagen()` if image exists → update product with new SKU → log old SKU in `producto_historial`
  4. On cancel: no changes
  5. Only visible when `autogenerar_activo = true` and product has an existing SKU
- **Depends on**: Tasks 3, 9
- **Estimated size**: M
- **Verification**: Edit existing product → click "Regenerar SKU" → confirm → new SKU assigned, old logged in historial, image renamed if existed. Cancel → no changes.

## Task 12: Admin SKU configuration page/section
- **Files**: `web/src/components/SkuConfigForm.tsx` (new), `web/src/pages/ConfiguracionPage.tsx` (modify or create)
- **Description**: SKU configuration UI for admins:
  1. Form to edit `empresa_configuracion_sku`: plantilla select, modo_contador select, longitud_secuencial input, prefijo_manual input, umbral_similitud slider/input
  2. Validation: if `plantilla = prefijo_fijo_secuencial`, prefijo_manual is required
  3. Save button calls `actualizarConfigSku()`
  4. Only accessible to admins (use `useUsuarioRol`)
  5. Shows current values, allows editing, saves on submit
- **Depends on**: Task 3
- **Estimated size**: M
- **Verification**: Admin opens config page → sees current SKU settings → changes plantilla → saves → verify DB row updated → next product creation uses new template

## Task 13: End-to-end verification
- **Files**: none (manual + automated verification)
- **Description**: Full integration test covering all specs:
  1. **SKU Config spec**: New empresa gets default config. Admin updates config. Non-admin denied access.
  2. **SKU generation spec**: Test all 3 templates produce correct format. Counter atomicity (concurrent creates). SKU read-only for non-admins. Admin override works.
  3. **Fuzzy matching spec**: Similar product triggers warning. User can confirm or cancel. Custom threshold works. Cross-empresa isolation.
  4. **Image storage spec**: Upload stores at SKU path. Rename works on regeneration. Delete cleans up images. Invalid file type rejected. File too large rejected.
  5. **Regression**: Existing product list still loads. Existing product edit still works. Offline/mock mode still functions.
- **Depends on**: Tasks 1–12
- **Estimated size**: M
- **Verification**: All manual scenarios pass. No console errors. Existing products unaffected by migration (no data migration required).

---

## Summary

| Task | Title | Size | Depends On |
|------|-------|------|------------|
| 1 | DDL migration (tables, indexes, trigger) | M | — |
| 2 | RPCs (generar_sku, buscar_productos_similares) | M | 1 |
| 3 | API layer (sku.ts) | S | 2 |
| 4 | useEmpresaConfig hook | S | 3 |
| 5 | useSkuPreview hook | S | 3 |
| 6 | SkuPreview component | S | — |
| 7 | DuplicadoAlert component | S | — |
| 8 | ProductoForm integration | L | 3,4,5,6,7 |
| 9 | productos.ts — SKU image paths | M | 1 |
| 10 | Image cleanup on delete | S | 9 |
| 11 | SKU regeneration flow | M | 3,9 |
| 12 | SKU config admin page | M | 3 |
| 13 | End-to-end verification | M | 1–12 |

**Task count:** 13
**Estimated total size:** ~7M + 6S = ~13 story points (approx. 2–3 sessions)
**Critical path:** 1 → 2 → 3 → 8 → 13

**Parallelization opportunities:**
- Tasks 6, 7 are pure presentational — can be built anytime
- Tasks 4, 5 can be built in parallel once Task 3 is done
- Task 9 can be built in parallel with Tasks 3–7 (only needs Task 1)
- Task 12 can be built in parallel with Tasks 4–8 (only needs Task 3)
