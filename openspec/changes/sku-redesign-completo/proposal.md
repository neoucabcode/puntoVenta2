# Proposal: SKU Redesign Completo

## Intent

The current SKU system has fundamental design flaws: SKU is editable without restrictions, depends on category (stale on category change), images are keyed by SKU (break on rename), duplicate detection is reactive (DB index only), and there's no catalog export/import for onboarding new tenants. This redesign makes SKU immutable ("birth name"), decouples images from SKU via UUID paths, adds real-time availability feedback, and enables catalog portability.

## Scope

### In Scope
- SKU immutability (admin-only edit with strong confirmation dialog, no category dependency)
- Storage path migration from `{empresa_id}/{sku}.webp` to `{empresa_id}/{producto_id}.webp`
- Backfill script for existing images (~586 products dev, ~472 prod)
- Real-time SKU availability check (debounced 300ms, shows available/taken)
- Dropdown of similar products while typing SKU (like catalog search)
- Replace native `confirm()` with proper confirmation dialog for SKU edits
- Catalog export as ZIP (`catalogo.json` + `imagenes/`)
- Catalog import via drag & drop (ZIP → categories + products + images)

### Out of Scope
- SKU auto-generation templates (already covered by `sku-configurable` change)
- Fuzzy matching for duplicate prevention (already covered by `sku-configurable` change)
- Schema changes (SKU column and unique index stay as-is)
- Product CRUD beyond SKU-related flows
- Image upload validation (already exists)

## Capabilities

### New Capabilities
- `catalog-portability`: Export and import full catalogs (categories + products + images) as ZIP archives for tenant onboarding
- `real-time-sku-feedback`: Real-time availability checks and similar product suggestions while typing SKU

### Modified Capabilities
- `sku-configuration`: SKU becomes immutable after creation; admin edit requires strong confirmation dialog; SKU regeneration replaces rename logic with UUID-based image path (no file rename needed)
- `image-storage`: Storage path changes from `{empresa_id}/{sku}.webp` to `{empresa_id}/{producto_id}.webp`; backfill existing images; image lifecycle decoupled from SKU changes

## Approach

1. **Storage migration first**: Backfill script moves images from SKU-based to UUID-based paths. Write-and-verify pattern: copy to new path, verify, then delete old path.
2. **Decouple SKU from images**: Update `lib/productos.ts` to use `producto_id` for image paths. Remove SKU rename logic from image operations.
3. **SKU immutability**: Add `sku_editable` state to form; admin toggle with confirmation dialog (custom React component, not native `confirm()`). SKU field disabled by default for existing products.
4. **Real-time feedback**: `useSkuPreview` hook with 300ms debounce calls `verificar_sku_disponible` RPC. `ProductoForm.tsx` renders availability indicator (✅/❌) and dropdown of similar products.
5. **Catalog export/import**: Export generates ZIP via Supabase Storage + client-side JSZip. Import uses drag & drop, processes categories first (dedup by name), then products (keep original SKUs), then images.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/lib/productos.ts` | Modified | Storage path logic moves from SKU to UUID |
| `web/src/lib/sku.ts` | Modified | Add availability check function |
| `web/src/hooks/useSkuPreview.ts` | Modified | Adapt for real-time availability |
| `web/src/components/ProductoForm.tsx` | Modified | SKU dropdown, availability indicator, confirmation dialog |
| `web/src/pages/InventarioPage.tsx` | Modified | Export button, import modal with drag & drop |
| `web/src/components/SkuConfirmDialog.tsx` | New | Strong confirmation dialog for SKU edits |
| `web/src/components/CatalogImportModal.tsx` | New | Drag & drop ZIP import modal |
| `web/src/lib/catalogo.ts` | New | Export/import logic (ZIP generation, parsing) |
| `supabase/migrations/` | New | Backfill script for image paths |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backfill script fails mid-migration (images partially moved) | Medium | Idempotent script: checks if new path exists before copy; verify step before delete; rollback = restore from old paths |
| Real-time SKU check causes Supabase rate limiting | Low | Debounce 300ms + cache results for 5s; RPC is lightweight (single index lookup) |
| Import from malformed ZIP crashes app | Medium | Validate ZIP structure before processing; show per-item progress; catch and report errors without losing partial state |
| SKU immutability breaks existing admin workflow | Low | Admin can still edit SKU via confirmation dialog; just requires explicit action instead of free edit |

## Rollback Plan

- **Storage migration**: Old images retained until backfill verified. Rollback = point `imagen_url` back to old paths and delete new paths.
- **SKU immutability**: Feature flag in `empresa_configuracion_sku`. Rollback = set flag to allow free editing.
- **Catalog import/export**: Pure UI addition. Rollback = remove buttons/components. No data impact.
- **Real-time feedback**: RPC and hook are additive. Rollback = remove hook usage from form. No data impact.

## Dependencies

- Supabase Storage RLS policies must allow `producto_id`-based paths (current policies are `empresa_id`-scoped, should work)
- `jszip` library for client-side ZIP generation/parsing
- Existing `buscar_productos_similares` RPC (from `sku-configurable`) for similar product dropdown
- `empresa_configuracion_sku` table (from `sku-configurable`) for SKU config

## Success Criteria

- [ ] All existing images accessible via new UUID-based paths
- [ ] Changing SKU does NOT break image display
- [ ] SKU field disabled by default for existing products; admin can edit with confirmation dialog
- [ ] Real-time availability indicator appears within 300ms of typing pause
- [ ] Similar products dropdown appears while typing SKU
- [ ] Export generates valid ZIP with `catalogo.json` + all images
- [ ] Import processes ZIP correctly: categories created, products created, images uploaded
- [ ] No native `confirm()` calls remain in SKU-related flows
