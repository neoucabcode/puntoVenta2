# Tasks: SKU Redesign Completo

## Review Workload Forecast

Estimated changed lines: 650–800
400-line budget risk: High
Chained PRs recommended: Yes
Delivery strategy: single-pr
Chain strategy: pending
Decision needed before apply: Yes

> ⚠️ BUDGET EXCEEDED: 650–800 lines vs. 400-line review budget. Requires `size:exception` or chained PR split.

### Suggested Work Units

| Unit | Goal | PR | Test command | Rollback |
|------|------|----|-------------|----------|
| 1 | Image storage + SKU immutability | 1 | `cd web && npx vitest run -- --testPathPattern="productos\|SkuConfirm\|useSkuDisp"` | `productos.ts`, `SkuConfirmDialog` |
| 2 | Real-time SKU feedback | 2 | `cd web && npx vitest run -- --testPathPattern="SkuAvail\|SkuSimilar"` | `SkuAvailabilityIndicator`, `SkuSimilarDropdown` |
| 3 | Catalog export/import + backfill | 3 | `cd web && npx vitest run -- --testPathPattern="catalogo"` | `catalogo.ts`, `CatalogImportModal` |

## Phase 1: Image Storage & SKU Immutability

- [x] 1.1 **RED** Test `subirImagenProducto` with `productoId` — assert path `${empresaId}/${productoId}.webp`
- [x] 1.2 **GREEN** Update `subirImagenProducto` in `productos.ts`: `sku` → `productoId`, path → UUID-based
- [x] 1.3 Remove `renombrarImagen` from `productos.ts` and all call sites
- [x] 1.4 Update `eliminarProducto`/`eliminarImagenProducto` to use `productoId` path
- [x] 1.5 **RED** Test `SkuConfirmDialog` two-step confirmation flow
- [x] 1.6 **GREEN** Create `SkuConfirmDialog.tsx` — warning → type SKU → confirm. Props: `{ currentSku, onConfirm, onCancel }`
- [x] 1.7 Add `verificarSkuDisponible` to `sku.ts` — calls RPC, returns `Promise<boolean>`

## Phase 2: Real-Time SKU Feedback

- [x] 2.1 **RED** Test `useSkuDisponibilidad` debounce + state transitions
- [x] 2.2 **GREEN** Create `useSkuDisponibilidad.ts` — 300ms debounce, RPC, returns `{ disponible, verificando }`
- [x] 2.3 **RED** Test `SkuAvailabilityIndicator` rendering (spinner/available/taken)
- [x] 2.4 **GREEN** Create `SkuAvailabilityIndicator.tsx` — spinner, ✅ "Disponible", ❌ "Ya existe"
- [x] 2.5 **RED** Test `SkuSimilarDropdown` selection and dismiss
- [x] 2.6 **GREEN** Create `SkuSimilarDropdown.tsx` — dropdown with `{ productos, onSelect, onDismiss }`

## Phase 3: Form Integration

- [x] 3.1 Wire `useSkuDisponibilidad` into `ProductoForm.tsx` — render indicator
- [x] 3.2 Add similar products dropdown to `ProductoForm.tsx`
- [x] 3.3 Replace inline confirm with `SkuConfirmDialog` in `ProductoForm.tsx`
- [x] 3.4 Remove `renombrarImagen` call from `handleRegenerarSku`
- [x] 3.5 Pass `productoId` (not SKU) to `subirImagenProducto`

## Phase 4: Catalog Export/Import

- [x] 4.1 **RED** Test `exportarCatalogo` — mock Supabase, verify ZIP structure
- [x] 4.2 **GREEN** Create `catalogo.ts` — `exportarCatalogo`: fetch data, build ZIP via JSZip
- [x] 4.3 **RED** Test `importarCatalogo` — verify category dedup, product creation
- [x] 4.4 **GREEN** Add `importarCatalogo` — parse ZIP, create categories/products/images
- [x] 4.5 **RED** Test `CatalogImportModal` drag & drop + progress display
- [x] 4.6 **GREEN** Create `CatalogImportModal.tsx` — drag & drop, validation, progress
- [x] 4.7 Add export/import buttons to `InventarioPage.tsx` — admin-gated

## Phase 5: Backfill & Polish

- [x] 5.1 Create `patch_13_backfill_image_paths.sql` — idempotent path mapping
- [ ] 5.2 Create `backfill-images.ts` — copy `${sku}.webp` → `${productoId}.webp`, verify, delete old
- [ ] 5.3 Add CSS to `index.css` for new components
- [ ] 5.4 Add test for `eliminarProducto` UUID-based cleanup
- [x] 5.5 Run full suite: `cd web && npx vitest run`
